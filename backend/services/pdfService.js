const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

/**
 * Embed signature on PDF document
 * This is the HARDEST and most critical function
 * @param {string} pdfPath - Path to the PDF file
 * @param {string} signatureBase64 - Base64 encoded signature image (PNG)
 * @returns {Promise<string>} - Path to the signed PDF
 */
const embedSignature = async (pdfPath, signatureBase64) => {
  try {
    console.log('📄 Starting PDF signature embedding...');
    console.log('PDF Path:', pdfPath);

    // Read the existing PDF file
    const existingPdfBytes = await fs.readFile(pdfPath);
    console.log('✅ PDF file read successfully');

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    console.log('✅ PDF document loaded');

    // Get all pages
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();
    console.log(`✅ PDF has ${pages.length} page(s), last page size: ${width}x${height}`);

    // Remove data:image/png;base64, prefix if present
    const base64Data = signatureBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    console.log('✅ Base64 signature data processed');

    // Embed the signature image
    let signatureImage;
    try {
      // Try PNG first
      signatureImage = await pdfDoc.embedPng(base64Data);
      console.log('✅ Signature embedded as PNG');
    } catch (pngError) {
      console.log('⚠️  PNG embedding failed, trying JPEG...');
      try {
        signatureImage = await pdfDoc.embedJpg(base64Data);
        console.log('✅ Signature embedded as JPEG');
      } catch (jpgError) {
        throw new Error('Failed to embed signature image. Invalid format.');
      }
    }

    // Calculate signature dimensions (maintain aspect ratio)
    const signatureWidth = 200;
    const signatureHeight = (signatureImage.height / signatureImage.width) * signatureWidth;

    // Position signature at bottom right of last page with padding
    const xPosition = width - signatureWidth - 50; // 50px padding from right
    const yPosition = 50; // 50px from bottom

    // Draw the signature on the last page
    lastPage.drawImage(signatureImage, {
      x: xPosition,
      y: yPosition,
      width: signatureWidth,
      height: signatureHeight,
    });

    // Add "Digitally Signed" text above signature
    lastPage.drawText('Digitally Signed', {
      x: xPosition,
      y: yPosition + signatureHeight + 10,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Add timestamp below signature
    const signedDate = new Date().toLocaleString();
    lastPage.drawText(`Signed: ${signedDate}`, {
      x: xPosition,
      y: yPosition - 15,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });

    console.log('✅ Signature image drawn on PDF');

    // Save the modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    await fs.writeFile(pdfPath, modifiedPdfBytes);
    console.log('✅ Modified PDF saved successfully');

    return pdfPath;
  } catch (error) {
    console.error('❌ Error embedding signature:', error.message);
    throw new Error(`Failed to embed signature: ${error.message}`);
  }
};

/**
 * Get PDF metadata
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<object>} - PDF metadata
 */
const getPdfMetadata = async (pdfPath) => {
  try {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    return {
      pageCount: pages.length,
      title: pdfDoc.getTitle() || 'Untitled',
      author: pdfDoc.getAuthor() || 'Unknown',
      createdAt: pdfDoc.getCreationDate(),
    };
  } catch (error) {
    throw new Error(`Failed to read PDF metadata: ${error.message}`);
  }
};

module.exports = {
  embedSignature,
  getPdfMetadata,
};
