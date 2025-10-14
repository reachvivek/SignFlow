/**
 * OTP Service - In-memory storage for OTP codes with database logging
 * For production, consider using Redis for better scalability
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Store OTPs in memory: { email: { otp, expiresAt, name, role } }
const otpStore = new Map();

/**
 * Generate a cryptographically secure random 6-digit OTP
 */
function generateOTP() {
  const crypto = require('crypto');
  // Generate cryptographically secure random bytes
  const randomBuffer = crypto.randomBytes(4);
  const randomNumber = randomBuffer.readUInt32BE(0);
  // Convert to 6-digit OTP (100000-999999)
  const otp = (randomNumber % 900000) + 100000;
  return otp.toString();
}

/**
 * Store OTP for an email with expiry
 */
async function storeOTP(email, otp, userData = {}) {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // Store in memory
  otpStore.set(email.toLowerCase(), {
    otp,
    expiresAt,
    ...userData,
    createdAt: new Date(),
  });

  // Log to database
  try {
    await prisma.oTPHistory.create({
      data: {
        email: email.toLowerCase(),
        otp,
        purpose: 'SIGNUP',
        expiresAt,
      },
    });
    console.log(`📝 OTP stored and logged for ${email}, expires at ${expiresAt.toLocaleTimeString()}`);
  } catch (error) {
    console.error('❌ Failed to log OTP to database:', error.message);
    // Don't throw - continue with in-memory OTP
  }

  // Auto-cleanup after expiry
  setTimeout(() => {
    if (otpStore.has(email.toLowerCase())) {
      otpStore.delete(email.toLowerCase());
      console.log(`🗑️  Expired OTP removed for ${email}`);
    }
  }, expiryMinutes * 60 * 1000);

  return { otp, expiresAt };
}

/**
 * Verify OTP for an email
 */
async function verifyOTP(email, otp) {
  const emailLower = email.toLowerCase();
  const stored = otpStore.get(emailLower);

  if (!stored) {
    return {
      success: false,
      error: 'OTP not found or expired. Please request a new OTP.',
    };
  }

  // Check if expired
  if (new Date() > stored.expiresAt) {
    otpStore.delete(emailLower);
    return {
      success: false,
      error: 'OTP has expired. Please request a new OTP.',
    };
  }

  // Check if OTP matches
  if (stored.otp !== otp.toString()) {
    return {
      success: false,
      error: 'Invalid OTP. Please check and try again.',
    };
  }

  // OTP is valid - mark as verified in database
  try {
    await prisma.oTPHistory.updateMany({
      where: {
        email: emailLower,
        otp: otp.toString(),
        verified: false,
      },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });
    console.log(`✅ OTP verified and logged for ${email}`);
  } catch (error) {
    console.error('❌ Failed to update OTP verification in database:', error.message);
    // Don't throw - continue with verification
  }

  // OTP is valid - return user data
  const userData = {
    name: stored.name,
    role: stored.role,
  };

  // Don't delete yet - will delete after successful registration
  console.log(`✅ OTP verified for ${email}`);

  return {
    success: true,
    userData,
  };
}

/**
 * Delete OTP after successful registration
 */
function deleteOTP(email) {
  const deleted = otpStore.delete(email.toLowerCase());
  if (deleted) {
    console.log(`🗑️  OTP removed for ${email} after successful registration`);
  }
  return deleted;
}

/**
 * Get remaining time for OTP
 */
function getOTPTimeRemaining(email) {
  const stored = otpStore.get(email.toLowerCase());
  if (!stored) return 0;

  const remaining = Math.max(0, stored.expiresAt - new Date());
  return Math.ceil(remaining / 1000); // Return seconds
}

/**
 * Clean up all expired OTPs (maintenance function)
 */
function cleanupExpiredOTPs() {
  const now = new Date();
  let cleaned = 0;

  for (const [email, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(email);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired OTPs`);
  }

  return cleaned;
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  deleteOTP,
  getOTPTimeRemaining,
  cleanupExpiredOTPs,
};
