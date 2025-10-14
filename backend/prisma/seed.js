const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * Seed database with test data
 * @param {boolean} reset - If true, clears all existing data first
 */
async function seedDatabase(reset = false) {
  console.log('🌱 Starting database seed...');

  if (reset) {
    console.log('🗑️  Clearing existing data...');
    await prisma.auditLog.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('✅ Database cleared');
  }

  // Check if users already exist
  const existingUploader = await prisma.user.findUnique({
    where: { email: 'uploader@example.com' },
  });

  const existingSigner = await prisma.user.findUnique({
    where: { email: 'signer@example.com' },
  });

  if (!reset && existingUploader && existingSigner) {
    console.log('✅ Users already exist. Skipping seed.');
    return { message: 'Users already exist' };
  }

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create uploader user
  const uploader = await prisma.user.create({
    data: {
      name: 'Test Uploader',
      email: 'uploader@example.com',
      password: hashedPassword,
      role: 'UPLOADER',
    },
  });
  console.log('✅ Created uploader:', uploader.email);

  // Create signer user
  const signer = await prisma.user.create({
    data: {
      name: 'Test Signer',
      email: 'signer@example.com',
      password: hashedPassword,
      role: 'SIGNER',
    },
  });
  console.log('✅ Created signer:', signer.email);

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🎉 Database seeded successfully!');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  📧 Test Credentials:');
  console.log('');
  console.log('  👤 Uploader Account:');
  console.log('     Email: uploader@example.com');
  console.log('     Password: password123');
  console.log('');
  console.log('  👤 Signer Account:');
  console.log('     Email: signer@example.com');
  console.log('     Password: password123');
  console.log('');
  console.log('  ℹ️  No sample documents created');
  console.log('     Upload real PDFs to test the system');
  console.log('');
  console.log('═══════════════════════════════════════════════════');

  return {
    message: 'Database seeded successfully',
    users: 2,
    documents: 0,
    auditLogs: 0,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');

  return await seedDatabase(reset);
}

// Export seedDatabase for use in API endpoint
module.exports = { seedDatabase };

// Only run main if this file is executed directly (not imported)
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
