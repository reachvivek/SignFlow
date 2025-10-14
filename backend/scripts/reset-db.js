/**
 * Database Reset Script
 * Truncates all tables and resets the database to a clean state
 *
 * Usage: npm run reset-db
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting database reset...\n');

  try {
    // Delete all records in order (respecting foreign key constraints)
    console.log('📋 Deleting audit logs...');
    const auditLogsDeleted = await prisma.auditLog.deleteMany({});
    console.log(`   ✅ Deleted ${auditLogsDeleted.count} audit log entries`);

    console.log('📄 Deleting documents...');
    const documentsDeleted = await prisma.document.deleteMany({});
    console.log(`   ✅ Deleted ${documentsDeleted.count} documents`);

    console.log('📧 Deleting email queue...');
    const emailQueueDeleted = await prisma.emailQueue.deleteMany({});
    console.log(`   ✅ Deleted ${emailQueueDeleted.count} email queue entries`);

    console.log('🔐 Deleting sessions...');
    const sessionsDeleted = await prisma.session.deleteMany({});
    console.log(`   ✅ Deleted ${sessionsDeleted.count} sessions`);

    console.log('🔢 Deleting OTP history...');
    const otpHistoryDeleted = await prisma.oTPHistory.deleteMany({});
    console.log(`   ✅ Deleted ${otpHistoryDeleted.count} OTP entries`);

    console.log('👥 Deleting users...');
    const usersDeleted = await prisma.user.deleteMany({});
    console.log(`   ✅ Deleted ${usersDeleted.count} users`);

    console.log('\n✅ Database reset complete! All tables are now empty.\n');
    console.log('💡 Tip: Run "npm run seed" to populate with sample data.\n');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
