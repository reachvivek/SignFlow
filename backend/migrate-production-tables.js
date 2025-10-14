const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🔄 Creating production tables...');

    // Create EmailQueue table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id TEXT PRIMARY KEY,
        "to" TEXT NOT NULL,
        subject TEXT NOT NULL,
        template TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        attempts INTEGER NOT NULL DEFAULT 0,
        maxAttempts INTEGER NOT NULL DEFAULT 3,
        error TEXT,
        sentAt DATETIME,
        scheduledFor DATETIME,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ EmailQueue table created');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS email_queue_status ON email_queue(status)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS email_queue_scheduledFor ON email_queue(scheduledFor)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS email_queue_createdAt ON email_queue(createdAt)
    `);

    // Create Session table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        device TEXT,
        browser TEXT,
        os TEXT,
        ip TEXT,
        userAgent TEXT,
        lastActivity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Session table created');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS sessions_userId ON sessions(userId)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS sessions_token ON sessions(token)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS sessions_expiresAt ON sessions(expiresAt)
    `);

    // Create OTPHistory table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS otp_history (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        otp TEXT NOT NULL,
        purpose TEXT NOT NULL,
        verified INTEGER NOT NULL DEFAULT 0,
        verifiedAt DATETIME,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ OTPHistory table created');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS otp_history_email ON otp_history(email)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS otp_history_expiresAt ON otp_history(expiresAt)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS otp_history_createdAt ON otp_history(createdAt)
    `);

    console.log('✅ All production tables created successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
