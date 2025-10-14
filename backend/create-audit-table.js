const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAuditLogsTable() {
  try {
    // Create audit_logs table using raw SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        documentId TEXT NOT NULL,
        action TEXT NOT NULL,
        performedBy TEXT NOT NULL,
        details TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_documentId ON audit_logs(documentId)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs(createdAt)
    `);

    console.log('✅ audit_logs table created successfully!');
  } catch (error) {
    console.error('Error creating audit_logs table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAuditLogsTable();
