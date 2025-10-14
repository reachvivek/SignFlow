const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const fs = require('fs');
const path = require('path');

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * Upload a PDF file to AWS S3
 * @param {string} filePath - Local file path
 * @param {object} options - Upload options
 * @returns {Promise<object>} - S3 upload result
 */
async function uploadPDF(filePath, options = {}) {
  try {
    const {
      userId = 'unknown',
      documentId = 'unknown',
      originalFileName = 'document.pdf',
    } = options;

    // Generate unique key for S3
    const timestamp = Date.now();
    const fileExtension = path.extname(originalFileName);
    const key = `documents/${userId}/${documentId}_${timestamp}${fileExtension}`;

    console.log('📤 Uploading PDF to S3:', {
      filePath,
      key,
      bucket: BUCKET_NAME,
    });

    // Read file
    const fileContent = fs.readFileSync(filePath);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: 'application/pdf',
      Metadata: {
        originalFileName: originalFileName,
        uploadedAt: new Date().toISOString(),
        userId: userId,
        documentId: documentId,
      },
    });

    await s3Client.send(command);

    // Generate a URL (we'll use pre-signed URLs for access)
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    console.log('✅ PDF uploaded to S3:', {
      url,
      key,
      size: fileContent.length,
    });

    return {
      success: true,
      url,
      key,
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION,
      size: fileContent.length,
    };
  } catch (error) {
    console.error('❌ S3 upload error:', error);
    throw new Error(`Failed to upload PDF to S3: ${error.message}`);
  }
}

/**
 * Download a PDF from S3 to a local path
 * @param {string} key - S3 object key
 * @param {string} localPath - Local path to save the file
 * @returns {Promise<string>} - Local file path
 */
async function downloadPDF(key, localPath) {
  try {
    console.log('📥 Downloading PDF from S3:', key);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    // Stream to file
    const fileStream = fs.createWriteStream(localPath);

    return new Promise((resolve, reject) => {
      response.Body.pipe(fileStream);

      fileStream.on('finish', () => {
        console.log('✅ PDF downloaded to:', localPath);
        resolve(localPath);
      });

      fileStream.on('error', (error) => {
        console.error('❌ Download error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('❌ S3 download error:', error);
    throw new Error(`Failed to download PDF from S3: ${error.message}`);
  }
}

/**
 * Update/Replace a PDF on S3 (for signed PDFs)
 * @param {string} key - S3 object key
 * @param {string} localFilePath - Local file path of the updated PDF
 * @returns {Promise<object>} - S3 upload result
 */
async function updatePDF(key, localFilePath) {
  try {
    console.log('🔄 Updating PDF on S3:', key);

    const fileContent = fs.readFileSync(localFilePath);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: 'application/pdf',
      Metadata: {
        updatedAt: new Date().toISOString(),
        signed: 'true',
      },
    });

    await s3Client.send(command);

    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    console.log('✅ PDF updated on S3:', url);

    return {
      success: true,
      url,
      key,
      size: fileContent.length,
    };
  } catch (error) {
    console.error('❌ S3 update error:', error);
    throw new Error(`Failed to update PDF on S3: ${error.message}`);
  }
}

/**
 * Delete a PDF from S3
 * @param {string} key - S3 object key
 * @returns {Promise<object>} - Deletion result
 */
async function deletePDF(key) {
  try {
    console.log('🗑️  Deleting PDF from S3:', key);

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    console.log('✅ PDF deleted from S3');

    return {
      success: true,
      message: 'File deleted successfully',
    };
  } catch (error) {
    console.error('❌ S3 delete error:', error);
    throw new Error(`Failed to delete PDF from S3: ${error.message}`);
  }
}

/**
 * Generate a pre-signed URL for accessing a PDF (valid for 1 hour)
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    console.log('✅ Generated pre-signed URL (expires in', expiresIn, 'seconds)');

    return url;
  } catch (error) {
    console.error('❌ Failed to generate pre-signed URL:', error);
    throw new Error(`Failed to generate pre-signed URL: ${error.message}`);
  }
}

/**
 * Extract S3 key from URL
 * @param {string} url - S3 URL
 * @returns {string} - S3 key
 */
function extractKeyFromUrl(url) {
  try {
    // Handle both formats:
    // https://bucket.s3.region.amazonaws.com/key
    // https://s3.region.amazonaws.com/bucket/key

    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Remove leading slash
    const key = pathname.startsWith('/') ? pathname.slice(1) : pathname;

    console.log('✅ Extracted key from URL:', key);
    return key;
  } catch (error) {
    console.error('❌ Failed to extract key from URL:', url);
    throw new Error(`Invalid S3 URL format: ${error.message}`);
  }
}

module.exports = {
  uploadPDF,
  downloadPDF,
  updatePDF,
  deletePDF,
  getPresignedUrl,
  extractKeyFromUrl,
};
