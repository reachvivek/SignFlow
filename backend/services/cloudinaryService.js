const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

/**
 * Upload a PDF file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Cloudinary upload result
 */
async function uploadPDF(filePath, options = {}) {
  try {
    const {
      userId = 'unknown',
      documentId = 'unknown',
      originalFileName = 'document.pdf',
    } = options;

    // Generate a unique public_id for the file
    const timestamp = Date.now();
    const publicId = `${userId}/${documentId}_${timestamp}`;

    console.log('📤 Uploading PDF to Cloudinary:', {
      filePath,
      publicId,
      originalFileName,
    });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'raw', // For PDFs and other non-image files
      folder: process.env.CLOUDINARY_FOLDER || 'pdf-signing',
      public_id: publicId,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      format: 'pdf',
      tags: ['pdf', 'document', userId, documentId],
      context: {
        original_filename: originalFileName,
        uploaded_at: new Date().toISOString(),
      },
    });

    console.log('✅ PDF uploaded to Cloudinary:', {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      createdAt: result.created_at,
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Failed to upload PDF to Cloudinary: ${error.message}`);
  }
}

/**
 * Download a PDF from Cloudinary to a temporary local path
 * @param {string} cloudinaryUrl - Cloudinary URL
 * @param {string} localPath - Local path to save the file
 * @returns {Promise<string>} - Local file path
 */
async function downloadPDF(cloudinaryUrl, localPath) {
  try {
    console.log('📥 Downloading PDF from Cloudinary:', cloudinaryUrl);

    const https = require('https');
    const file = fs.createWriteStream(localPath);

    return new Promise((resolve, reject) => {
      https.get(cloudinaryUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('✅ PDF downloaded to:', localPath);
          resolve(localPath);
        });
      }).on('error', (error) => {
        fs.unlink(localPath, () => {}); // Delete the file on error
        reject(error);
      });
    });
  } catch (error) {
    console.error('❌ Cloudinary download error:', error);
    throw new Error(`Failed to download PDF from Cloudinary: ${error.message}`);
  }
}

/**
 * Update/Replace a PDF on Cloudinary (for signed PDFs)
 * @param {string} publicId - Cloudinary public_id
 * @param {string} localFilePath - Local file path of the updated PDF
 * @returns {Promise<object>} - Cloudinary upload result
 */
async function updatePDF(publicId, localFilePath) {
  try {
    console.log('🔄 Updating PDF on Cloudinary:', publicId);

    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'raw',
      public_id: publicId,
      overwrite: true, // Replace the existing file
      invalidate: true, // Invalidate CDN cache
      tags: ['pdf', 'document', 'signed'],
    });

    console.log('✅ PDF updated on Cloudinary:', result.secure_url);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      version: result.version,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('❌ Cloudinary update error:', error);
    throw new Error(`Failed to update PDF on Cloudinary: ${error.message}`);
  }
}

/**
 * Delete a PDF from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<object>} - Cloudinary deletion result
 */
async function deletePDF(publicId) {
  try {
    console.log('🗑️  Deleting PDF from Cloudinary:', publicId);

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
      invalidate: true,
    });

    console.log('✅ PDF deleted from Cloudinary:', result);

    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw new Error(`Failed to delete PDF from Cloudinary: ${error.message}`);
  }
}

/**
 * Extract Cloudinary public_id from URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
function extractPublicId(url) {
  try {
    // Extract public_id from Cloudinary URL
    // Example: https://res.cloudinary.com/dazctlr75/raw/upload/v1234567890/pdf-signing/userId/documentId_timestamp.pdf
    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
    if (matches && matches[1]) {
      return matches[1];
    }
    throw new Error('Invalid Cloudinary URL format');
  } catch (error) {
    console.error('❌ Failed to extract public_id from URL:', url);
    throw error;
  }
}

/**
 * Get PDF metadata from Cloudinary
 * @param {string} publicId - Cloudinary public_id
 * @returns {Promise<object>} - Resource details
 */
async function getPDFInfo(publicId) {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'raw',
    });

    return {
      publicId: result.public_id,
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
      createdAt: result.created_at,
      tags: result.tags,
      context: result.context,
    };
  } catch (error) {
    console.error('❌ Cloudinary get info error:', error);
    throw new Error(`Failed to get PDF info from Cloudinary: ${error.message}`);
  }
}

module.exports = {
  uploadPDF,
  downloadPDF,
  updatePDF,
  deletePDF,
  extractPublicId,
  getPDFInfo,
};
