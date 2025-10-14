const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const prisma = require("../db/prismaClient");
const { generateToken } = require("../utils/jwt");
const { authenticate } = require("../middleware/auth");
const { sendOTPEmail, sendWelcomeEmail } = require("../services/emailService");
const {
  generateOTP,
  storeOTP,
  verifyOTP,
  deleteOTP,
} = require("../services/otpService");

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to email for verification
 * @access  Public
 */
router.post("/send-otp", async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Validation
    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: "Please provide name, email, and role",
      });
    }

    // Validate role
    if (role.toUpperCase() !== "UPLOADER" && role.toUpperCase() !== "SIGNER") {
      return res.status(400).json({
        success: false,
        error: "Role must be either UPLOADER or SIGNER",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP with user data
    await storeOTP(email, otp, { name, role: role.toUpperCase() });

    // Send OTP email
    await sendOTPEmail(email, name, otp);

    console.log(`✅ OTP sent to ${email}`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
    });
  } catch (error) {
    console.error("❌ Send OTP error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to send OTP",
    });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and OTP",
      });
    }

    // Verify OTP
    const verification = await verifyOTP(email, otp);

    if (!verification.success) {
      return res.status(400).json(verification);
    }

    console.log(`✅ OTP verified for ${email}`);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      userData: verification.userData,
    });
  } catch (error) {
    console.error("❌ Verify OTP error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to verify OTP",
    });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (with OTP verification)
 * @access  Public
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, otp } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error:
          "Please provide all required fields: name, email, password, role",
      });
    }

    // Verify OTP if provided (new flow)
    if (otp) {
      const verification = await verifyOTP(email, otp);
      if (!verification.success) {
        return res.status(400).json(verification);
      }
    }

    // Validate role
    if (role.toUpperCase() !== "UPLOADER" && role.toUpperCase() !== "SIGNER") {
      return res.status(400).json({
        success: false,
        error: "Role must be either UPLOADER or SIGNER",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role.toUpperCase(),
      },
    });

    // Delete OTP after successful registration
    if (otp) {
      deleteOTP(email);
    }

    // Send welcome email (don't block on this)
    sendWelcomeEmail(user.email, user.name, user.role).catch((err) => {
      console.error("⚠️  Failed to send welcome email:", err.message);
    });

    // Generate token
    const token = generateToken(user.id, user.role);

    console.log("✅ User registered:", user.email);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error during registration",
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    console.log("🔐 Login attempt:", { email, role });

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check role if provided
    if (role && user.role !== role.toUpperCase()) {
      return res.status(401).json({
        success: false,
        error: `This account is not registered as ${role}`,
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    // Create session record
    const userAgent = req.headers["user-agent"] || "Unknown";
    const ip = req.ip || req.connection.remoteAddress || "Unknown";

    // Parse user agent for device info (simple parsing)
    const isMobile = /mobile/i.test(userAgent);
    const isTablet = /tablet|ipad/i.test(userAgent);
    const device = isMobile ? "Mobile" : isTablet ? "Tablet" : "Desktop";

    // Parse browser
    let browser = "Unknown";
    if (/chrome/i.test(userAgent)) browser = "Chrome";
    else if (/firefox/i.test(userAgent)) browser = "Firefox";
    else if (/safari/i.test(userAgent)) browser = "Safari";
    else if (/edge/i.test(userAgent)) browser = "Edge";

    // Parse OS
    let os = "Unknown";
    if (/windows/i.test(userAgent)) os = "Windows";
    else if (/mac/i.test(userAgent)) os = "MacOS";
    else if (/linux/i.test(userAgent)) os = "Linux";
    else if (/android/i.test(userAgent)) os = "Android";
    else if (/ios|iphone|ipad/i.test(userAgent)) os = "iOS";

    // Session expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          device,
          browser,
          os,
          ip,
          userAgent,
          expiresAt,
        },
      });
      console.log("✅ Session created for:", user.email);
    } catch (sessionError) {
      console.error("⚠️  Failed to create session:", sessionError.message);
      // Don't block login if session creation fails
    }

    console.log("✅ Login successful:", user.email);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error during login",
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and delete session
 * @access  Private
 */
router.post("/logout", authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token && prisma.session) {
      try {
        // Delete session from database
        await prisma.session.deleteMany({
          where: { token },
        });
        console.log("✅ Session deleted for user:", req.userId);
      } catch (sessionError) {
        console.warn("⚠️  Session deletion failed (table may not exist):", sessionError.message);
        // Don't fail logout if session deletion fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error during logout",
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
});

module.exports = router;
