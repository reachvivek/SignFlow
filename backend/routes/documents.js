const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const prisma = require('../db/prismaClient');
const { authenticate, isUploader, isSigner } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { embedSignature } = require('../services/pdfService');
const s3Service = require('../services/s3Service');
const { sendDocumentAssignmentEmail } = require('../services/emailService');

/**
 * Helper function to create audit log entries
 */
async function createAuditLog(documentId, action, performedBy, details = null) {
  try {
    await prisma.auditLog.create({
      data: {
        documentId,
        action,
        performedBy,
        details,
      },
    });
    console.log(`📝 Audit log created: ${action} by ${performedBy}`);
  } catch (error) {
    console.error('❌ Failed to create audit log:', error);
    // Don't throw - audit log failure shouldn't break the main operation
  }
}

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a new document
 * @access  Private (Uploader only)
 */
router.post('/upload', authenticate, isUploader, upload.single('file'), async (req, res) => {
  try {
    const { name, assignedTo } = req.body;

    console.log('📤 Upload request:', { name, assignedTo, file: req.file?.originalname });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF file',
      });
    }

    if (!name || !assignedTo) {
      return res.status(400).json({
        success: false,
        error: 'Please provide document name and assignedTo email',
      });
    }

    // Create a temporary document ID for S3 organization
    const tempDocId = `doc_${Date.now()}`;

    // Upload file to AWS S3
    console.log('☁️  Uploading to AWS S3...');
    const s3Result = await s3Service.uploadPDF(req.file.path, {
      userId: req.userId,
      documentId: tempDocId,
      originalFileName: req.file.originalname,
    });

    // Generate pre-signed URL for access (valid for 7 days)
    const presignedUrl = await s3Service.getPresignedUrl(s3Result.key, 604800);

    // Create document record with S3 URL
    const document = await prisma.document.create({
      data: {
        name,
        originalFileName: req.file.originalname,
        fileUrl: presignedUrl,
        s3Key: s3Result.key,
        uploadedById: req.userId,
        assignedTo: assignedTo.toLowerCase().trim(),
        status: 'PENDING',
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Clean up local file after upload
    try {
      fs.unlinkSync(req.file.path);
      console.log('🗑️  Local file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️  Failed to cleanup local file:', cleanupError.message);
    }

    console.log('✅ Document uploaded:', document.id);

    // Create audit log for document creation
    await createAuditLog(
      document.id,
      'Created',
      document.uploadedBy.name,
      `Document uploaded and assigned to ${assignedTo}`
    );

    // Send email notification to assigned signer (don't block on this)
    sendDocumentAssignmentEmail(
      assignedTo,
      document.uploadedBy.name,
      document.name,
      document.id
    ).catch(err => {
      console.error('⚠️  Failed to send assignment email:', err.message);
    });

    res.status(201).json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('❌ Upload error:', error);

    // Clean up local file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️  Failed to cleanup local file on error');
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Server error during upload',
    });
  }
});

/**
 * @route   GET /api/documents/stats
 * @desc    Get document statistics for current user
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    let where = {};

    // Filter based on user role
    if (req.userRole === 'UPLOADER') {
      where.uploadedById = req.userId;
    } else if (req.userRole === 'SIGNER') {
      // Get user email to match assignedTo
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });
      where.assignedTo = user.email;
    }

    // Get counts for each status
    const [pending, signed, verified, rejected] = await Promise.all([
      prisma.document.count({ where: { ...where, status: 'PENDING' } }),
      prisma.document.count({ where: { ...where, status: 'SIGNED' } }),
      prisma.document.count({ where: { ...where, status: 'VERIFIED' } }),
      prisma.document.count({ where: { ...where, status: 'REJECTED' } }),
    ]);

    console.log(`📊 Stats retrieved for user role: ${req.userRole}`);

    res.status(200).json({
      success: true,
      stats: {
        pending,
        signed,
        verified,
        rejected,
      },
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

/**
 * @route   GET /api/documents
 * @desc    Get documents for current user with pagination and filters
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      page = '1',
      limit = '10',
      search = '',
      dateFilter = 'all'
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let where = {};

    // Filter based on user role
    if (req.userRole === 'UPLOADER') {
      where.uploadedById = req.userId;
    } else if (req.userRole === 'SIGNER') {
      // Get user email to match assignedTo
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });
      where.assignedTo = user.email;
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    // Filter by search query (document name or original file name)
    if (search && search.trim() !== '') {
      where.OR = [
        {
          name: {
            contains: search.trim(),
          },
        },
        {
          originalFileName: {
            contains: search.trim(),
          },
        },
      ];
    }

    // Filter by date
    if (dateFilter && dateFilter !== 'all') {
      const now = new Date();
      let startDate;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        where.createdAt = {
          gte: startDate,
        };
      }
    }

    // Get total count for pagination
    const total = await prisma.document.count({ where });

    // Get paginated documents
    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    console.log(`📋 Retrieved ${documents.length} of ${total} documents for user role: ${req.userRole} (page ${pageNum})`);

    res.status(200).json({
      success: true,
      documents,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('❌ Get documents error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

/**
 * @route   GET /api/documents/:id
 * @desc    Get single document
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Check access permissions
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    const isOwner = document.uploadedById === req.userId;
    const isAssignedSigner = document.assignedTo === user.email;

    if (!isOwner && !isAssignedSigner) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this document',
      });
    }

    res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('❌ Get document error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

/**
 * @route   POST /api/documents/:id/sign
 * @desc    Sign a document (HARDEST - PDF signature embedding)
 * @access  Private (Signer only)
 */
router.post('/:id/sign', authenticate, isSigner, upload.single('signedPdf'), async (req, res) => {
  let tempFilePath = null;

  try {
    const { signatureData } = req.body;
    const signedPdfFile = req.file; // Client-side signed PDF

    console.log('✍️  Sign request for document:', req.params.id);
    console.log('📄 Has signed PDF file:', !!signedPdfFile);

    if (!signatureData) {
      return res.status(400).json({
        success: false,
        error: 'Please provide signature data',
      });
    }

    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Check if user is assigned to this document
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (document.assignedTo !== user.email) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to sign this document',
      });
    }

    // Check if already signed
    if (document.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Document has already been signed or processed',
      });
    }

    const tempDir = process.env.UPLOAD_DIR || 'uploads';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Check if client-side signed PDF was provided
    if (signedPdfFile) {
      // Client-side signing - use the uploaded signed PDF
      console.log('📄 Using client-side signed PDF');
      tempFilePath = signedPdfFile.path;
    } else {
      // Server-side signing - download, sign, and upload
      console.log('📥 Downloading PDF from AWS S3 for server-side signing...');
      tempFilePath = path.join(tempDir, `temp_${document.id}_${Date.now()}.pdf`);
      await s3Service.downloadPDF(document.s3Key, tempFilePath);

      // Embed signature on PDF (HARDEST PART)
      console.log('📝 Embedding signature on PDF:', tempFilePath);
      await embedSignature(tempFilePath, signatureData);
    }

    // Upload signed PDF back to S3 (replace original)
    console.log('☁️  Uploading signed PDF to AWS S3...');
    const s3Result = await s3Service.updatePDF(
      document.s3Key,
      tempFilePath
    );

    // Generate new pre-signed URL for the signed PDF (valid for 7 days)
    const presignedUrl = await s3Service.getPresignedUrl(document.s3Key, 604800);

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        signatureData,
        status: 'SIGNED',
        signedAt: new Date(),
        fileUrl: presignedUrl, // Update with new pre-signed URL
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
      console.log('🗑️  Temp file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️  Failed to cleanup temp file:', cleanupError.message);
    }

    console.log('✅ Document signed successfully:', document.id);

    // Create audit log for document signing
    await createAuditLog(
      document.id,
      'Signed',
      user.name,
      `Document signed by ${user.email}`
    );

    res.status(200).json({
      success: true,
      message: 'Document signed successfully',
      document: updatedDocument,
    });
  } catch (error) {
    console.error('❌ Sign document error:', error);

    // Clean up temp file on error
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️  Failed to cleanup temp file on error');
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Server error during signing',
    });
  }
});

/**
 * @route   POST /api/documents/:id/verify
 * @desc    Verify a signed document
 * @access  Private (Uploader only)
 */
router.post('/:id/verify', authenticate, isUploader, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Check if uploader owns this document
    if (document.uploadedById !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to verify this document',
      });
    }

    // Check if document is signed
    if (document.status !== 'SIGNED') {
      return res.status(400).json({
        success: false,
        error: 'Document must be signed before verification',
      });
    }

    // Update document status
    const updatedDocument = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log('✅ Document verified:', document.id);

    // Get user info for audit log
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    // Create audit log for document verification
    await createAuditLog(
      document.id,
      'Accepted',
      user.name,
      `Document accepted by ${user.email}`
    );

    res.status(200).json({
      success: true,
      message: 'Document verified successfully',
      document: updatedDocument,
    });
  } catch (error) {
    console.error('❌ Verify document error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

/**
 * @route   POST /api/documents/:id/reject
 * @desc    Reject a signed document
 * @access  Private (Uploader only)
 */
router.post('/:id/reject', authenticate, isUploader, async (req, res) => {
  try {
    const { reason } = req.body;

    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Check if uploader owns this document
    if (document.uploadedById !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to reject this document',
      });
    }

    // Update document status
    const updatedDocument = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason || 'No reason provided',
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log('❌ Document rejected:', document.id);

    // Get user info for audit log
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    // Create audit log for document rejection
    await createAuditLog(
      document.id,
      'Rejected',
      user.name,
      reason || 'No reason provided'
    );

    res.status(200).json({
      success: true,
      message: 'Document rejected',
      document: updatedDocument,
    });
  } catch (error) {
    console.error('❌ Reject document error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

/**
 * @route   GET /api/documents/:id/audit-logs
 * @desc    Get audit logs for a document
 * @access  Private
 */
router.get('/:id/audit-logs', authenticate, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Check access permissions
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    const isOwner = document.uploadedById === req.userId;
    const isAssignedSigner = document.assignedTo === user.email;

    if (!isOwner && !isAssignedSigner) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view audit logs for this document',
      });
    }

    // Fetch audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { documentId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    // Transform to match frontend expectations
    const logs = auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      performedBy: log.performedBy,
      performedAt: log.createdAt,
      details: log.details,
    }));

    console.log(`📋 Retrieved ${logs.length} audit logs for document: ${req.params.id}`);

    res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error('❌ Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document
 * @access  Private (Uploader only)
 */
router.delete('/:id', authenticate, isUploader, async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Check if uploader owns this document
    if (document.uploadedById !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this document',
      });
    }

    // Delete from S3 if s3Key exists
    if (document.s3Key) {
      try {
        console.log('☁️  Deleting file from AWS S3...');
        await s3Service.deletePDF(document.s3Key);
      } catch (s3Error) {
        console.warn('⚠️  Failed to delete from S3:', s3Error.message);
        // Continue with database deletion even if S3 delete fails
      }
    }

    // Delete document (cascade will delete audit logs)
    await prisma.document.delete({
      where: { id: req.params.id },
    });

    console.log('✅ Document deleted:', req.params.id);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete document error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

/**
 * @route   GET /api/documents/:id/view
 * @desc    Get PDF as base64 for document viewing
 * @access  Private
 */
router.get('/:id/view', authenticate, async (req, res) => {
  let tempFilePath = null;

  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
      });
    }

    // Check access permissions
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    const isOwner = document.uploadedById === req.userId;
    const isAssignedSigner = document.assignedTo === user.email;

    if (!isOwner && !isAssignedSigner) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this document',
      });
    }

    // Check if document has S3 key
    if (!document.s3Key) {
      return res.status(400).json({
        success: false,
        error: 'Document file not available',
      });
    }

    // Download PDF from S3 to temp location
    console.log('📥 Downloading PDF from S3 for base64 conversion...');
    const tempDir = process.env.UPLOAD_DIR || 'uploads';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempFilePath = path.join(tempDir, `view_${document.id}_${Date.now()}.pdf`);
    await s3Service.downloadPDF(document.s3Key, tempFilePath);

    // Read file and convert to base64
    console.log('🔄 Converting PDF to base64...');
    const pdfBuffer = fs.readFileSync(tempFilePath);
    const base64Data = pdfBuffer.toString('base64');

    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
      console.log('🗑️  Temp file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️  Failed to cleanup temp file:', cleanupError.message);
    }

    console.log('✅ Sending base64 PDF data to frontend');

    res.status(200).json({
      success: true,
      data: base64Data,
      mimeType: 'application/pdf',
      fileName: document.originalFileName || 'document.pdf',
    });
  } catch (error) {
    console.error('❌ Get view error:', error);

    // Clean up temp file on error
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️  Failed to cleanup temp file on error');
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
});

module.exports = router;
