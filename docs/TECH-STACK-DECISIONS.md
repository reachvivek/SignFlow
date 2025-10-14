# Technical Stack Decisions - PDF Signing Application

**Project**: SignFlow - PDF Document Signing Platform
**Date**: October 14, 2025
**Deadline**: October 15, 2025 (Tomorrow!)

---

## Executive Summary

This document explains the technical decisions made for the PDF Signing Application, specifically addressing:
1. **Why Node.js/Express instead of NestJS**
2. **Why Prisma ORM instead of Mongoose**
3. **Why SQLite (MVP) with migration path to PostgreSQL**

---

## 1. Backend Framework: Node.js + Express vs NestJS

### Decision: **Node.js with Express**

### Why Node.js/Express Was Chosen

#### ✅ **Time Constraints (Critical Factor)**
- **Deadline**: Less than 24 hours remaining
- **Express**: Can build MVP in 4-6 hours
- **NestJS**: Would require 8-12 hours (setup + learning curve)
- **Result**: Chose speed over enterprise features

#### ✅ **Simplicity for MVP**
```
Express (Simple):
├── routes/
│   ├── auth.js        (straightforward routing)
│   └── documents.js
└── server.js          (minimal config)

NestJS (Complex):
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── dto/
│   ├── documents/
│   │   ├── documents.controller.ts
│   │   ├── documents.service.ts
│   │   ├── documents.module.ts
│   │   └── dto/
│   └── app.module.ts
```

#### ✅ **Lower Learning Curve**
- Express: Minimal boilerplate, straightforward routing
- NestJS: Requires understanding of decorators, modules, dependency injection
- **Team familiarity**: Express is more universally known

#### ✅ **Smaller Bundle Size**
- Express app: ~50MB node_modules
- NestJS app: ~150MB+ node_modules
- **Impact**: Faster deployment, less disk space

### When to Use NestJS Instead

NestJS would be better for:
- **Large enterprise applications** (100+ endpoints)
- **Teams** (5+ developers)
- **Microservices architecture**
- **Projects with 3+ months timeline**
- **Applications requiring GraphQL**
- **Need for built-in dependency injection**

### Comparison Table

| Feature | Express (Our Choice) | NestJS |
|---------|---------------------|--------|
| **Setup Time** | 30 minutes | 2-3 hours |
| **Learning Curve** | Low | Medium-High |
| **Boilerplate Code** | Minimal | Significant |
| **TypeScript** | Optional | Required |
| **Decorator Support** | No | Yes |
| **Built-in Validation** | Manual (joi/express-validator) | Yes (class-validator) |
| **Dependency Injection** | Manual | Built-in |
| **Testing** | Manual setup | Built-in |
| **Best For** | **MVP, Small-Medium Apps** | Large Enterprise Apps |
| **Our Use Case** | ✅ Perfect | ❌ Overkill |

---

## 2. Database: SQLite vs PostgreSQL

### Decision: **SQLite for MVP** → **PostgreSQL for Production**

### Why SQLite for MVP

#### ✅ **Zero Configuration** (Critical for Deadline)
```bash
# PostgreSQL Setup (Complex):
1. Install PostgreSQL server
2. Create database
3. Configure connection
4. Set up credentials
5. Manage permissions
Time: 1-2 hours

# SQLite Setup (Simple):
1. npm install prisma @prisma/client
2. DATABASE_URL="file:./dev.db"
3. npx prisma migrate dev
Time: 5 minutes
```

#### ✅ **No Server Required**
- SQLite: File-based database (`dev.db`)
- PostgreSQL: Requires running server
- **Benefit**: Easier for teammates to run locally

#### ✅ **Perfect for Development**
- Self-contained in one file
- Easy to reset/delete
- No connection issues
- Portable across machines

#### ✅ **Easy Migration Path**
```prisma
// Change just ONE line in schema.prisma:

// Development (SQLite):
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Production (PostgreSQL):
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Migration to PostgreSQL (Production)

When deploying to production:

**Step 1**: Update `.env`
```env
# From:
DATABASE_URL="file:./dev.db"

# To:
DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"
```

**Step 2**: Update `prisma/schema.prisma`
```prisma
datasource db {
  provider = "postgresql"  // Changed from "sqlite"
  url      = env("DATABASE_URL")
}
```

**Step 3**: Run migration
```bash
npx prisma migrate deploy
```

### PostgreSQL Advantages (For Production)

1. **Better Concurrency**: Handles multiple users simultaneously
2. **ACID Compliance**: Stronger data integrity
3. **Better Performance**: For large datasets (1000+ documents)
4. **Advanced Features**: Full-text search, JSON queries, etc.
5. **Scalability**: Can handle millions of rows
6. **Cloud Support**: Heroku, Railway, Supabase all support PostgreSQL

---

## 3. ORM: Prisma vs Mongoose

### Decision: **Prisma ORM** (As Required)

### Why Prisma Was Chosen

#### ✅ **Assignment Requirement**
- Assignment specifically mentions **"Prisma or Mongoose"**
- Prisma is more modern and recommended

#### ✅ **Type Safety** (Better than Mongoose)
```typescript
// Prisma (Fully Typed):
const user = await prisma.user.findUnique({
  where: { email: "test@example.com" }
});
// TypeScript knows: user.id, user.name, user.email, user.role

// Mongoose (Requires Manual Types):
const user = await User.findOne({ email: "test@example.com" });
// TypeScript doesn't know what fields exist
```

#### ✅ **Auto-Generated Types**
```bash
npx prisma generate
# Automatically creates TypeScript types from schema
```

#### ✅ **Database Agnostic**
- Works with SQLite, PostgreSQL, MySQL, MongoDB, SQL Server
- **Mongoose**: Only works with MongoDB

#### ✅ **Better Developer Experience**
```prisma
// Prisma Schema (Easy to Read):
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  role      Role
  documents Document[]
}

// Mongoose Schema (More Verbose):
const userSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['uploader', 'signer'] }
});
```

#### ✅ **Prisma Studio** (Visual Database Tool)
```bash
npx prisma studio
# Opens a web UI to view/edit database records
```

### Prisma vs Mongoose Comparison

| Feature | Prisma (Our Choice) | Mongoose |
|---------|-------------------|----------|
| **Database Support** | SQLite, PostgreSQL, MySQL, etc | MongoDB Only |
| **Type Safety** | Automatic | Manual |
| **Schema Definition** | Declarative (schema.prisma) | Imperative (JS code) |
| **Migrations** | Built-in | Manual |
| **Query Builder** | Type-safe | String-based |
| **Learning Curve** | Low | Medium |
| **Visual Tool** | Yes (Prisma Studio) | No |
| **Performance** | Excellent | Good |
| **Our Use Case** | ✅ Perfect | ⚠️  MongoDB only |

---

## 4. File Storage: Local vs Cloud

### Current: **Local Storage (uploads/ folder)**
### Production: **AWS S3 or Cloudinary** (Recommended)

### Why Local Storage for MVP

#### ✅ **Fastest Implementation**
- Setup time: 10 minutes
- No external dependencies
- No API keys needed

#### ✅ **Good for Development**
- Easy to test
- Files visible in project folder
- No cost

### Production Migration

For production deployment, migrate to cloud storage:

**Option A: AWS S3** (Most Popular)
```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const uploadToS3 = async (file) => {
  const params = {
    Bucket: 'pdf-signing-docs',
    Key: file.filename,
    Body: file.buffer,
  };
  return await s3.upload(params).promise();
};
```

**Option B: Cloudinary** (Easier Setup)
```javascript
const cloudinary = require('cloudinary').v2;

const uploadToCloudinary = async (file) => {
  return await cloudinary.uploader.upload(file.path, {
    resource_type: 'raw',
    folder: 'pdf-documents'
  });
};
```

---

## 5. PDF Processing: pdf-lib

### Decision: **pdf-lib** (Best for Node.js)

### Why pdf-lib

#### ✅ **Most Popular** (15k+ stars on GitHub)
#### ✅ **Pure JavaScript** (No native dependencies)
#### ✅ **Browser + Node.js** (Can use same code on frontend if needed)
#### ✅ **Well Documented** (Comprehensive examples)
#### ✅ **Active Development** (Regular updates)

### Implementation
```javascript
const { PDFDocument } = require('pdf-lib');

// Embed signature on PDF
const pdfBytes = await fs.readFile('document.pdf');
const pdfDoc = await PDFDocument.load(pdfBytes);
const pages = pdfDoc.getPages();
const lastPage = pages[pages.length - 1];

// Draw signature image
lastPage.drawImage(signatureImage, {
  x: 50,
  y: 50,
  width: 200,
  height: 100
});

const modifiedPdf = await pdfDoc.save();
```

---

## 6. Authentication: JWT

### Decision: **JSON Web Tokens (JWT)**

### Why JWT

#### ✅ **Stateless** (No server-side session storage)
#### ✅ **Scalable** (Can use across multiple servers)
#### ✅ **Standard** (Industry best practice for APIs)
#### ✅ **Mobile-Friendly** (Easy to use in mobile apps)

### Implementation
```javascript
const jwt = require('jsonwebtoken');

// Generate token
const token = jwt.sign(
  { userId, role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Verify token
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

---

## Final Tech Stack Summary

### Frontend
- **Framework**: Remix (React 18)
- **Styling**: Tailwind CSS v3
- **Language**: TypeScript
- **Icons**: Font Awesome
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: JavaScript (CommonJS)
- **ORM**: Prisma
- **Database**: SQLite (MVP) → PostgreSQL (Production)
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **PDF Processing**: pdf-lib
- **Validation**: bcryptjs (password hashing)

### DevOps
- **Dev Server**: Nodemon
- **Database Tool**: Prisma Studio
- **API Testing**: cURL / Thunder Client / Postman

---

## Why These Choices Were Right for Our Project

### 1. **Time-Constrained** ⏱️
- Deadline: < 24 hours
- Need: Fast implementation
- Choice: Simple, proven technologies

### 2. **MVP Focus** 🎯
- Need: Working product, not perfect product
- Choice: SQLite, local storage, Express

### 3. **Scalability Path** 📈
- All choices have clear upgrade paths:
  - SQLite → PostgreSQL (one line change)
  - Local storage → S3/Cloudinary (swap storage layer)
  - Express → NestJS (if needed for enterprise)

### 4. **Developer Experience** 👨‍💻
- Prisma: Auto-generated types
- Express: Minimal boilerplate
- SQLite: No server management

---

## Production Checklist

When deploying to production, upgrade:

- [ ] Switch to PostgreSQL database
- [ ] Use AWS S3 or Cloudinary for file storage
- [ ] Add rate limiting (express-rate-limit)
- [ ] Add request validation (joi or class-validator)
- [ ] Add logging (winston or pino)
- [ ] Add monitoring (Sentry)
- [ ] Use environment-specific configs
- [ ] Set up CI/CD pipeline
- [ ] Enable HTTPS
- [ ] Add CORS whitelist

---

## Conclusion

Our tech stack was optimized for:
1. **Speed** (meet 24-hour deadline)
2. **Simplicity** (MVP, not enterprise)
3. **Flexibility** (easy to upgrade later)
4. **Best Practices** (follows assignment requirements)

**Result**: Fully functional backend API built in ~6 hours with clear path to production scaling.

---

**Last Updated**: October 14, 2025
**Status**: Backend Complete ✅
**Next**: Frontend Integration
