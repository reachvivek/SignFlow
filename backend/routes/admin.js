const express = require('express');
const router = express.Router();
const { seedDatabase } = require('../prisma/seed');
const { sendOTPEmail } = require('../services/emailService');

/**
 * @route   POST /api/admin/reset-database
 * @desc    Reset and seed database with test data (DEVELOPMENT ONLY)
 * @access  Public in development, disabled in production
 */
router.post('/reset-database', async (req, res) => {
  try {
    // IMPORTANT: Disable in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Database reset is disabled in production environment',
      });
    }

    console.log('🔄 Database reset requested...');

    // Call seedDatabase with reset=true
    const result = await seedDatabase(true);

    res.status(200).json({
      success: true,
      message: 'Database reset and seeded successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ Database reset error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset database',
    });
  }
});

/**
 * @route   POST /api/admin/seed-database
 * @desc    Seed database with test data without reset
 * @access  Public in development, disabled in production
 */
router.post('/seed-database', async (req, res) => {
  try {
    // IMPORTANT: Disable in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Database seeding is disabled in production environment',
      });
    }

    console.log('🌱 Database seed requested...');

    // Call seedDatabase with reset=false
    const result = await seedDatabase(false);

    res.status(200).json({
      success: true,
      message: result.message || 'Database seeded successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ Database seed error:', error);
    res.status(200).json({
      success: false,
      error: error.message || 'Failed to seed database',
    });
  }
});

/**
 * @route   POST /api/admin/test-email
 * @desc    Send test email (DEVELOPMENT ONLY)
 * @access  Public in development
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email address',
      });
    }

    console.log(`📧 Sending test email to ${email}...`);

    // Generate test OTP
    const testOTP = '123456';

    // Send test email
    await sendOTPEmail(email, name || 'Test User', testOTP);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      sentTo: email,
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email',
    });
  }
});

module.exports = router;
