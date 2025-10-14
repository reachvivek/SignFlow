const nodemailer = require('nodemailer');

// Create transporter - supports both Gmail and Outlook
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail', // 'gmail' or 'outlook'
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service ready:', {
      host: process.env.EMAIL_HOST,
      from: process.env.EMAIL_FROM,
    });
  }
});

/**
 * Send OTP email for signup verification
 */
async function sendOTPEmail(email, name, otp) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your SignFlow Account - OTP Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #000; background: #fff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; padding: 0; }
            .header { background: #000; color: #fff; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { background: #fff; padding: 40px 30px; border: 1px solid #e5e5e5; border-top: none; }
            .content h2 { margin: 0 0 20px 0; font-size: 20px; font-weight: 600; }
            .content p { margin: 0 0 16px 0; color: #333; }
            .otp-box { background: #f9f9f9; border: 2px solid #000; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 42px; font-weight: 700; color: #000; letter-spacing: 10px; font-family: 'Courier New', monospace; }
            .otp-validity { margin: 12px 0 0 0; color: #666; font-size: 13px; }
            .important { background: #f9f9f9; border-left: 3px solid #000; padding: 15px; margin: 20px 0; font-size: 14px; }
            .footer { text-align: center; padding: 30px; color: #999; font-size: 12px; border: 1px solid #e5e5e5; border-top: none; }
            .footer p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SignFlow</h1>
              <p>Account Verification</p>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Thank you for signing up with SignFlow. To complete your registration, please enter the verification code below:</p>

              <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <p class="otp-validity">Valid for ${process.env.OTP_EXPIRY_MINUTES} minutes</p>
              </div>

              <div class="important">
                <strong>Security Notice:</strong> This code will expire in ${process.env.OTP_EXPIRY_MINUTES} minutes. Never share this code with anyone. SignFlow will never ask for your verification code.
              </div>

              <p>If you didn't request this code, please ignore this email and ensure your account security.</p>

              <p style="margin-top: 30px;">Best regards,<br><strong>The SignFlow Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 SignFlow. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent:', { to: email, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Failed to send OTP email: ' + error.message);
  }
}

/**
 * Send document assignment notification to signer
 */
async function sendDocumentAssignmentEmail(signerEmail, uploaderName, documentName, documentId) {
  try {
    const signUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/signer`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: signerEmail,
      subject: `New Document to Sign: ${documentName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #000; background: #fff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; padding: 0; }
            .header { background: #000; color: #fff; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { background: #fff; padding: 40px 30px; border: 1px solid #e5e5e5; border-top: none; }
            .content h2 { margin: 0 0 20px 0; font-size: 20px; font-weight: 600; }
            .content p { margin: 0 0 16px 0; color: #333; }
            .document-box { background: #f9f9f9; border: 2px solid #000; padding: 25px; margin: 25px 0; }
            .document-box h3 { margin: 0 0 15px 0; font-size: 18px; font-weight: 600; }
            .document-box p { margin: 5px 0; color: #666; font-size: 14px; }
            .steps { background: #f9f9f9; padding: 20px; margin: 20px 0; }
            .steps ol { margin: 10px 0; padding-left: 20px; }
            .steps li { margin: 8px 0; color: #333; }
            .button { display: inline-block; padding: 16px 40px; background: #000; color: #fff; text-decoration: none; margin: 25px 0; font-weight: 600; border: 2px solid #000; }
            .button:hover { background: #333; }
            .footer { text-align: center; padding: 30px; color: #999; font-size: 12px; border: 1px solid #e5e5e5; border-top: none; }
            .footer p { margin: 5px 0; }
            .alt-link { font-size: 13px; color: #666; margin: 15px 0; }
            .alt-link a { color: #000; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SignFlow</h1>
              <p>Document Signature Request</p>
            </div>
            <div class="content">
              <h2>Document Assignment</h2>
              <p><strong>${uploaderName}</strong> has assigned you a document that requires your signature.</p>

              <div class="document-box">
                <h3>${documentName}</h3>
                <p><strong>Assigned by:</strong> ${uploaderName}</p>
                <p><strong>Status:</strong> Pending Your Signature</p>
              </div>

              <div class="steps">
                <strong>Next Steps:</strong>
                <ol>
                  <li>Access SignFlow using the button below</li>
                  <li>Log in to your account (or create one if needed)</li>
                  <li>Review the document carefully</li>
                  <li>Add your digital signature</li>
                </ol>
              </div>

              <center>
                <a href="${signUrl}" class="button">Sign Document</a>
              </center>

              <p class="alt-link">
                Or copy this link: <a href="${signUrl}">${signUrl}</a>
              </p>

              <p style="margin-top: 30px; font-size: 14px;">If you have questions about this document, please contact ${uploaderName} directly.</p>

              <p style="margin-top: 30px;">Best regards,<br><strong>The SignFlow Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 SignFlow. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Document assignment email sent:', {
      to: signerEmail,
      document: documentName,
      messageId: info.messageId
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending document assignment email:', error);
    throw new Error('Failed to send assignment email: ' + error.message);
  }
}

/**
 * Send welcome email after successful signup
 */
async function sendWelcomeEmail(email, name, role) {
  try {
    const dashboardUrl = role === 'UPLOADER'
      ? `${process.env.FRONTEND_URL || 'http://localhost:3001'}/uploader`
      : `${process.env.FRONTEND_URL || 'http://localhost:3001'}/signer`;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to SignFlow',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #000; background: #fff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; padding: 0; }
            .header { background: #000; color: #fff; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { background: #fff; padding: 40px 30px; border: 1px solid #e5e5e5; border-top: none; }
            .content h2 { margin: 0 0 20px 0; font-size: 20px; font-weight: 600; }
            .content h3 { margin: 25px 0 15px 0; font-size: 16px; font-weight: 600; }
            .content p { margin: 0 0 16px 0; color: #333; }
            .role-badge { display: inline-block; background: #f9f9f9; border: 1px solid #000; padding: 8px 16px; margin: 10px 0; font-weight: 600; }
            .feature-box { background: #fff; border: 1px solid #e5e5e5; padding: 18px; margin: 12px 0; }
            .feature-box strong { display: block; margin-bottom: 5px; font-size: 15px; }
            .feature-box span { color: #666; font-size: 14px; }
            .button { display: inline-block; padding: 16px 40px; background: #000; color: #fff; text-decoration: none; margin: 25px 0; font-weight: 600; border: 2px solid #000; }
            .button:hover { background: #333; }
            .footer { text-align: center; padding: 30px; color: #999; font-size: 12px; border: 1px solid #e5e5e5; border-top: none; }
            .footer p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SignFlow</h1>
              <p>Your account is ready</p>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>Welcome to SignFlow - your platform for secure digital document signing.</p>

              <p>Your account has been created as: <span class="role-badge">${role === 'UPLOADER' ? 'Document Uploader' : 'Document Signer'}</span></p>

              ${role === 'UPLOADER' ? `
              <h3>Your Capabilities:</h3>
              <div class="feature-box">
                <strong>Upload Documents</strong>
                <span>Upload PDF documents that require signatures</span>
              </div>
              <div class="feature-box">
                <strong>Assign Signers</strong>
                <span>Send documents to signers via email notifications</span>
              </div>
              <div class="feature-box">
                <strong>Review & Approve</strong>
                <span>Review signed documents and accept or reject them</span>
              </div>
              <div class="feature-box">
                <strong>Track Activity</strong>
                <span>Monitor document status and view complete audit trails</span>
              </div>
              ` : `
              <h3>Your Capabilities:</h3>
              <div class="feature-box">
                <strong>View Assignments</strong>
                <span>Access all documents assigned to you for signature</span>
              </div>
              <div class="feature-box">
                <strong>Digital Signatures</strong>
                <span>Sign documents securely with your digital signature</span>
              </div>
              <div class="feature-box">
                <strong>Track Documents</strong>
                <span>Monitor pending and completed document status</span>
              </div>
              `}

              <center>
                <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
              </center>

              <p style="margin-top: 30px;"><strong>Getting Started</strong></p>
              <p>Access your dashboard to begin. The interface is designed to be intuitive and straightforward.</p>

              <p style="margin-top: 30px;">Best regards,<br><strong>The SignFlow Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 SignFlow. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', { to: email, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw - welcome email failure shouldn't block signup
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOTPEmail,
  sendDocumentAssignmentEmail,
  sendWelcomeEmail,
};
