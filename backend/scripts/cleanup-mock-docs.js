const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupMockDocuments() {
  try {
    console.log('🗑️  Cleaning up mock documents...');

    // Delete documents that don't have s3Key (old mock documents)
    // Or delete specific documents by name
    const result = await prisma.document.deleteMany({
      where: {
        OR: [
          { name: 'Employment Contract' },
          { name: 'NDA Agreement' },
          { s3Key: null }, // Documents without S3 key are old mocks
        ],
      },
    });

    console.log(`✅ Deleted ${result.count} mock documents`);

    // Show remaining documents
    const remaining = await prisma.document.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        s3Key: true,
        createdAt: true,
      },
    });

    console.log(`\n📄 Remaining documents: ${remaining.length}`);
    remaining.forEach((doc) => {
      console.log(`  - ${doc.name} (${doc.status}) - ${doc.s3Key ? 'Has S3 key' : 'NO S3 key'}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanupMockDocuments();
