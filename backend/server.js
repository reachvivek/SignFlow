require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    // Allow any localhost with any port
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})); // Enable CORS for frontend
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies (large limit for base64 signatures)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PDF Signing API Docs',
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PDF Signing API is running',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PDF Signing Application API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (requires auth token)',
      },
      documents: {
        upload: 'POST /api/documents/upload (uploader only)',
        getAll: 'GET /api/documents',
        getOne: 'GET /api/documents/:id',
        sign: 'POST /api/documents/:id/sign (signer only)',
        verify: 'POST /api/documents/:id/verify (uploader only)',
        reject: 'POST /api/documents/:id/reject (uploader only)',
        view: 'GET /api/documents/:id/view',
        auditLogs: 'GET /api/documents/:id/audit-logs',
        delete: 'DELETE /api/documents/:id (uploader only)',
      },
      admin: {
        resetDatabase: 'POST /api/admin/reset-database (development only)',
        seedDatabase: 'POST /api/admin/seed-database (development only)',
      },
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err);

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size too large. Maximum size is 10MB',
    });
  }

  if (err.message === 'Only PDF files are allowed') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📄 PDF Signing Application Backend API');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  ✅ Server running on: http://localhost:${PORT}`);
  console.log(`  ✅ Health check: http://localhost:${PORT}/health`);
  console.log(`  ✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  ✅ Database: SQLite (Prisma ORM)`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  💡 Test credentials:');
  console.log('     - uploader@example.com / password123');
  console.log('     - signer@example.com / password123');
  console.log('');
  console.log(`  📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing server');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
