# SignFlow - PDF Document Signing Platform

<div align="center">

![SignFlow Logo](https://img.shields.io/badge/SignFlow-PDF_Signing-blue?style=for-the-badge)

**A modern, secure, and intuitive platform for digital document signing workflows**

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![AWS S3](https://img.shields.io/badge/AWS-S3-orange?style=flat-square&logo=amazon-aws)](https://aws.amazon.com/s3/)

### Watch the Demo

[![SignFlow Demo Video](https://img.youtube.com/vi/5okLOo2USVw/maxresdefault.jpg)](https://youtu.be/5okLOo2USVw?si=sSFVTFPBDhnovdAu)

**[View Full Demo on YouTube →](https://youtu.be/5okLOo2USVw?si=sSFVTFPBDhnovdAu)**

[Features](#features) • [Architecture](#architecture) • [Installation](#installation) • [API Docs](#api-documentation)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Usage](#usage)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

**SignFlow** is a full-stack PDF signing application designed to streamline document workflows. It enables uploaders to assign documents for digital signatures and allows signers to complete signing tasks with ease. The platform features JWT-based authentication, role-based access control, real-time status tracking, and comprehensive audit logging.

### Key Highlights

- **Secure Authentication** - JWT-based auth with OTP verification
- **Digital Signatures** - Canvas-based signature capture with PDF embedding
- **Cloud Storage** - AWS S3 integration for scalable document storage
- **Audit Trails** - Complete action logging for compliance
- **Mobile Responsive** - Optimized for all device sizes
- **Production Ready** - Session management, error handling, and security best practices

---

## Features

### Core Functionality

#### Authentication & Authorization
- **JWT-based authentication** with secure token management
- **OTP-based signup** via email (Nodemailer + Gmail SMTP)
- **Role-based access control** (Uploader / Signer)
- **Session tracking** with device, browser, OS, and IP logging
- **Auto-submit OTP** on 6th digit entry for better UX

#### Uploader Role
- Upload PDF documents to AWS S3
- Assign documents to signers via email
- Review signed documents (Accept/Reject with reason)
- View audit logs and document history
- Dashboard with real-time stats:
  - Pending documents
  - Awaiting review (signed)
  - Verified documents
  - Rejected documents

#### Signer Role
- View assigned documents
- Digital signature capture via canvas
- Auto-filled email, manual name/date fields
- Submit signed documents
- Dashboard with stats:
  - Awaiting signature
  - Signed documents
  - Verified documents
  - Rejected documents

#### Document Management
- **Document statuses:** PENDING → SIGNED → VERIFIED / REJECTED
- **PDF preview** with embedded signature overlay
- **Audit logging** for all document actions
- **Email notifications** for document assignments
- **Timestamps** for upload, signature, verification events

### Advanced Features

#### Comprehensive Audit Log System
- Tracks all document actions (Created, Assigned, Signed, Verified, Rejected)
- Records user information (name, email, timestamp)
- Accessible via dedicated modal in uploader dashboard
- Provides complete compliance trail for regulatory requirements

#### Real-Time Role-Based Dashboards
- **Live statistics** for both uploader and signer roles
- **Visual stat cards** with color-coded metrics
- **Smart alert banners** for pending actions
- **Fully responsive grid layouts** for all devices

#### Premium UI/UX Design
- **Modal-based authentication** for seamless user experience
- **Toast notifications** with undo functionality
- **Professional document upload animations**
- **Mobile-first responsive design** optimized for all screen sizes
- **Clean, intuitive interface** built with Tailwind CSS

#### Developer-Friendly Database Tools
- **Quick database reset** (`npm run reset-db`) for development
- **Automated seeding** (`npm run seed`) for test data
- **Foreign key constraint handling** for data integrity
- **Automated database migrations** with Prisma

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15.5.5 | React framework with App Router |
| **React** | 19.1.0 | UI library |
| **TypeScript** | 5.0 | Type-safe development |
| **Tailwind CSS** | 4.0 | Utility-first styling |
| **pdf-lib** | 1.17.1 | PDF manipulation and signature embedding |
| **react-signature-canvas** | 1.1.0 | Digital signature capture |
| **react-pdf** | 10.2.0 | PDF rendering and preview |
| **pdfjs-dist** | 5.4.296 | PDF.js worker for rendering |
| **axios** | 1.12.2 | HTTP client |
| **dayjs** | 1.11.18 | Date formatting |
| **react-draggable** | 4.5.0 | Signature field positioning |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20+ | JavaScript runtime |
| **Express** | 5.1.0 | Web framework |
| **Prisma** | 6.17.1 | ORM and database toolkit |
| **SQLite** | - | Development database |
| **bcryptjs** | 3.0.2 | Password hashing |
| **jsonwebtoken** | 9.0.2 | JWT authentication |
| **AWS SDK (S3)** | 3.908.0 | Cloud file storage |
| **Multer** | 2.0.2 | File upload handling |
| **Nodemailer** | 6.9.16 | Email service |
| **pdf-lib** | 1.17.1 | PDF signature embedding |
| **CORS** | 2.8.5 | Cross-origin resource sharing |
| **dotenv** | 17.2.3 | Environment configuration |
| **swagger-ui-express** | 5.0.1 | API documentation |
| **nodemon** | 3.1.10 | Development auto-reload |

### Infrastructure
- **AWS S3** - Document storage with pre-signed URLs
- **Gmail SMTP** - Email delivery service
- **Git** - Version control
- **GitHub** - Code repository

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │    Mobile    │  │    Tablet    │          │
│  │  (Desktop)   │  │    Device    │  │    Device    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
│         └─────────────────┴─────────────────┘                    │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  App Router (TypeScript + React 19)                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │    │
│  │  │   Auth   │  │ Uploader │  │  Signer  │             │    │
│  │  │  Modal   │  │Dashboard │  │Dashboard │             │    │
│  │  └──────────┘  └──────────┘  └──────────┘             │    │
│  │  ┌──────────────────────────────────────┐             │    │
│  │  │  PDF Preview & Signature Components  │             │    │
│  │  └──────────────────────────────────────┘             │    │
│  └────────────────────────────────────────────────────────┘    │
│  Tailwind CSS + Responsive Design                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS (REST API)
                            │ JWT Bearer Token
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js + Express)                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  API Routes                                            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │    │
│  │  │   Auth   │  │Documents │  │  Email   │             │    │
│  │  │  Routes  │  │  Routes  │  │  Queue   │             │    │
│  │  └──────────┘  └──────────┘  └──────────┘             │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Middleware Layer                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │    │
│  │  │   Auth   │  │   CORS   │  │  Multer  │             │    │
│  │  │Middleware│  │          │  │ (Upload) │             │    │
│  │  └──────────┘  └──────────┘  └──────────┘             │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Services Layer                                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │    │
│  │  │ AWS S3   │  │   Email  │  │   PDF    │             │    │
│  │  │ Service  │  │ Service  │  │ Service  │             │    │
│  │  └──────────┘  └──────────┘  └──────────┘             │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────┬────────────┬────────────────────────────┘
                        │            │
                        ▼            ▼
        ┌───────────────────┐  ┌──────────────┐
        │   Prisma ORM      │  │   AWS S3     │
        │                   │  │   Bucket     │
        └─────────┬─────────┘  └──────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │  SQLite Database  │
        │  ┌──────────────┐ │
        │  │    Users     │ │
        │  │  Documents   │ │
        │  │  AuditLogs   │ │
        │  │  Sessions    │ │
        │  │ OTPHistory   │ │
        │  │ EmailQueue   │ │
        │  └──────────────┘ │
        └───────────────────┘
```

### Request Flow Diagram

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ 1. Login Request
     ├─────────────────────────────────────────────────────────▶
     │                                                          ┌──────────────┐
     │                                                          │   Backend    │
     │                                                          │  (Express)   │
     │                                                          └──────┬───────┘
     │                                                                 │
     │                                                                 │ 2. Validate Credentials
     │                                                                 │ (bcrypt compare)
     │                                                                 ▼
     │                                                          ┌──────────────┐
     │                                                          │   Database   │
     │                                                          │   (Prisma)   │
     │                                                          └──────┬───────┘
     │                                                                 │
     │                                                                 │ 3. Create Session
     │                                                                 │
     │◀────────────────────────────────────────────────────────────────┤
     │ 4. JWT Token + User Data                                       │
     │                                                                 │
     │ 5. Upload PDF Request (with JWT)                               │
     ├─────────────────────────────────────────────────────────────────▶
     │                                                                 │
     │                                                                 │ 6. Authenticate JWT
     │                                                                 │
     │                                                                 │ 7. Upload to S3
     │                                                                 ▼
     │                                                          ┌──────────────┐
     │                                                          │    AWS S3    │
     │                                                          └──────┬───────┘
     │                                                                 │
     │                                                                 │ 8. Get Pre-signed URL
     │                                                                 │
     │                                                                 ▼
     │                                                          ┌──────────────┐
     │                                                          │   Database   │
     │                                                          │ Save Doc Info│
     │                                                          └──────┬───────┘
     │                                                                 │
     │                                                                 │ 9. Create Audit Log
     │                                                                 │
     │                                                                 │ 10. Send Email
     │                                                                 ▼
     │                                                          ┌──────────────┐
     │                                                          │   Nodemailer │
     │                                                          └──────────────┘
     │◀────────────────────────────────────────────────────────────────┤
     │ 11. Success Response                                            │
     │                                                                 │
     │ 12. Sign Document Request                                      │
     ├─────────────────────────────────────────────────────────────────▶
     │                                                                 │
     │                                                                 │ 13. Get PDF from S3
     │                                                                 │
     │                                                                 │ 14. Embed Signature
     │                                                                 │    (pdf-lib)
     │                                                                 │
     │                                                                 │ 15. Upload Signed PDF
     │                                                                 │
     │                                                                 │ 16. Update DB Status
     │                                                                 │
     │◀────────────────────────────────────────────────────────────────┤
     │ 17. Success Response                                            │
     │                                                                 │
```

### Authentication Flow

```
┌────────────┐         ┌────────────┐         ┌────────────┐
│  Sign Up   │         │ OTP Verify │         │  Password  │
│   Step 1   │────────▶│   Step 2   │────────▶│   Step 3   │
└────────────┘         └────────────┘         └────────────┘
     │                       │                       │
     │ Name, Email, Role     │ 6-Digit OTP          │ Password
     ▼                       ▼                       ▼
┌──────────────────────────────────────────────────────────┐
│                   Backend Validation                      │
│  • Email uniqueness  • OTP expiry check  • Hash password │
└───────────────────────────┬──────────────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  Create User   │
                   │  in Database   │
                   └────────┬───────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Generate JWT   │
                   │  Create Session│
                   └────────┬───────┘
                            │
                            ▼
                   ┌────────────────┐
                   │   Return Token │
                   │   + User Data  │
                   └────────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────┐
│            User                 │
├─────────────────────────────────┤
│ • id (UUID, PK)                 │
│ • name (String)                 │
│ • email (String, Unique)        │
│ • password (String, Hashed)     │
│ • role (Enum: UPLOADER/SIGNER) │
│ • createdAt (DateTime)          │
└──────────┬──────────────────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│         Document                │        │          AuditLog               │
├─────────────────────────────────┤        ├─────────────────────────────────┤
│ • id (UUID, PK)                 │◀──────▶│ • id (UUID, PK)                 │
│ • name (String)                 │  1:N   │ • documentId (FK)               │
│ • originalFileName (String)     │        │ • action (String)               │
│ • fileUrl (String)              │        │ • performedBy (String)          │
│ • s3Key (String)                │        │ • details (String, Optional)    │
│ • status (Enum)                 │        │ • createdAt (DateTime)          │
│ • uploadedById (UUID, FK)       │        └─────────────────────────────────┘
│ • assignedTo (String, Email)    │
│ • signatureData (String)        │
│ • signedAt (DateTime)           │
│ • verifiedAt (DateTime)         │
│ • rejectedAt (DateTime)         │
│ • rejectionReason (String)      │
│ • createdAt (DateTime)          │
│ • updatedAt (DateTime)          │
└──────────┬──────────────────────┘
           │
           │ Status Flow
           ▼
    ┌─────────────┐
    │   PENDING   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   SIGNED    │
    └──────┬──────┘
           │
       ┌───┴───┐
       ▼       ▼
┌──────────┐ ┌──────────┐
│ VERIFIED │ │ REJECTED │
└──────────┘ └──────────┘


┌─────────────────────────────────┐
│           Session               │
├─────────────────────────────────┤
│ • id (UUID, PK)                 │
│ • userId (UUID, FK)             │───┐
│ • token (String, Unique)        │   │
│ • device (String)               │   │ N:1
│ • browser (String)              │   │
│ • os (String)                   │   │
│ • ip (String)                   │   │
│ • userAgent (String)            │   │
│ • lastActivity (DateTime)       │   │
│ • expiresAt (DateTime)          │   │
│ • createdAt (DateTime)          │   │
└─────────────────────────────────┘   │
                                      │
                                      ▼
                             ┌─────────────┐
                             │    User     │
                             └─────────────┘


┌─────────────────────────────────┐
│         OTPHistory              │
├─────────────────────────────────┤
│ • id (UUID, PK)                 │
│ • email (String)                │
│ • otp (String)                  │
│ • purpose (String)              │
│ • verified (Boolean)            │
│ • verifiedAt (DateTime)         │
│ • expiresAt (DateTime)          │
│ • createdAt (DateTime)          │
└─────────────────────────────────┘


┌─────────────────────────────────┐
│         EmailQueue              │
├─────────────────────────────────┤
│ • id (UUID, PK)                 │
│ • to (String)                   │
│ • subject (String)              │
│ • template (String)             │
│ • data (JSON String)            │
│ • status (Enum)                 │
│ • attempts (Int)                │
│ • maxAttempts (Int)             │
│ • error (String)                │
│ • sentAt (DateTime)             │
│ • scheduledFor (DateTime)       │
│ • createdAt (DateTime)          │
│ • updatedAt (DateTime)          │
└─────────────────────────────────┘
```

### Relationships

- **User → Document**: One-to-Many (A user can upload multiple documents)
- **Document → AuditLog**: One-to-Many (Each document has multiple audit entries)
- **User → Session**: One-to-Many (A user can have multiple active sessions)
- **OTPHistory**: Standalone (Tracks all OTP attempts)
- **EmailQueue**: Standalone (Manages email delivery queue)

### Indexes

- `Document.uploadedById` - Fast uploader queries
- `Document.assignedTo` - Fast signer queries
- `Document.status` - Status-based filtering
- `Session.userId` - User session lookup
- `Session.token` - JWT validation
- `AuditLog.documentId` - Document history
- `OTPHistory.email` - OTP verification

---

## Project Structure

### Backend Structure

```
backend/
├── config/
│   └── swagger.js                 # Swagger configuration
├── db/
│   └── prismaClient.js            # Prisma client instance
├── middleware/
│   ├── auth.js                    # JWT authentication middleware
│   └── upload.js                  # Multer file upload configuration
├── prisma/
│   ├── schema.prisma              # Database schema definition
│   ├── migrations/                # Database migrations
│   └── seed.js                    # Seed script for test data
├── routes/
│   ├── auth.js                    # Authentication endpoints
│   ├── documents.js               # Document CRUD operations
│   └── health.js                  # Health check endpoint
├── scripts/
│   └── reset-db.js                # Database reset utility
├── services/
│   ├── s3Service.js               # AWS S3 integration
│   ├── emailService.js            # Nodemailer email service
│   └── pdfService.js              # PDF manipulation with pdf-lib
├── uploads/                       # Temporary file uploads (gitignored)
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies and scripts
├── server.js                      # Express server entry point
└── swagger.yaml                   # OpenAPI specification
```

### Frontend Structure

```
frontend/
├── app/
│   ├── components/
│   │   ├── Header.tsx             # Navigation header
│   │   ├── AuthModal.tsx          # Login/Signup modal
│   │   ├── DocumentReviewModal.tsx # Accept/Reject modal
│   │   └── AuditLogModal.tsx      # Document history modal
│   ├── contexts/
│   │   ├── ToastContext.tsx       # Global toast notifications
│   │   └── ModalContext.tsx       # Modal management
│   ├── config/
│   │   └── api.ts                 # API endpoints configuration
│   ├── uploader/
│   │   ├── page.tsx               # Uploader dashboard
│   │   ├── upload/
│   │   │   └── page.tsx           # Document upload form
│   │   └── preview/
│   │       └── [id]/
│   │           └── page.tsx       # Document preview & review
│   ├── signer/
│   │   ├── page.tsx               # Signer dashboard
│   │   ├── sign/
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Document signing interface
│   │   └── preview/
│   │       └── [id]/
│   │           └── page.tsx       # Signed document preview
│   ├── globals.css                # Global styles & Tailwind
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page
├── public/                        # Static assets
├── .gitignore                     # Git ignore rules
├── next.config.js                 # Next.js configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json                   # Dependencies and scripts
```

---

## Installation

### Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn**
- **Git**
- **AWS Account** (for S3 storage)
- **Gmail Account** (for email service)

### Step 1: Clone Repository

```bash
git clone https://github.com/reachvivek/SignFlow.git
cd SignFlow
```

### Step 2: Backend Setup

```bash
cd Project/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials (see Environment Variables section)

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed database with test users
npm run seed

# Start backend server
npm run dev
```

Backend will run on `http://localhost:5000`

### Step 3: Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start frontend server
npm run dev
```

Frontend will run on `http://localhost:3000`

### Step 4: Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api-docs
- **Prisma Studio**: `npx prisma studio` (Database GUI)

### Test Credentials

After running `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Uploader | uploader@example.com | password123 |
| Signer | signer@example.com | password123 |

---

## Environment Variables

### Backend (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="file:./prisma/dev.db"

# JWT Secret (Generate: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-change-this

# AWS S3 Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=SignFlow <your-gmail@gmail.com>

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (Next.js Environment)

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Gmail App Password Setup

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Create new app password for "Mail"
5. Use generated password in `EMAIL_PASS`

### AWS S3 Setup

1. Create S3 bucket in AWS Console
2. Enable "Block all public access" = OFF
3. Add CORS configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["http://localhost:3000"],
        "ExposeHeaders": []
    }
]
```

4. Create IAM user with S3 permissions
5. Get Access Key ID and Secret Access Key

---

## API Documentation

### Swagger UI

Access interactive API documentation at:
```
http://localhost:5000/api-docs
```

### Authentication Endpoints

#### Sign Up (Step 1: Send OTP)
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "UPLOADER"
}
```

#### Sign Up (Step 2: Verify OTP)
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### Sign Up (Step 3: Set Password)
```http
POST /api/auth/complete-signup
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "uploader@example.com",
  "password": "password123",
  "role": "UPLOADER"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Uploader User",
    "email": "uploader@example.com",
    "role": "UPLOADER"
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Document Endpoints

#### Upload Document
```http
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "name": "Contract Agreement",
  "file": <PDF file>,
  "assignedTo": "signer@example.com"
}
```

#### Get Documents (Role-Based)
```http
GET /api/documents
Authorization: Bearer <token>

Response (Uploader):
{
  "success": true,
  "documents": [...]
}

Response (Signer):
{
  "success": true,
  "documents": [...] // Only assigned documents
}
```

#### Get Document Details
```http
GET /api/documents/:id
Authorization: Bearer <token>
```

#### View Document (Get Pre-signed URL)
```http
GET /api/documents/:id/view
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": "base64-encoded-pdf-content"
}
```

#### Sign Document
```http
POST /api/documents/:id/sign
Authorization: Bearer <token>
Content-Type: application/json

{
  "signatureData": "data:image/png;base64,...",
  "name": "John Signer",
  "email": "signer@example.com"
}
```

#### Verify Document (Uploader)
```http
POST /api/documents/:id/verify
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Document verified successfully"
}
```

#### Reject Document (Uploader)
```http
POST /api/documents/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Signature is unclear"
}
```

#### Get Audit Logs
```http
GET /api/documents/:id/audit-logs
Authorization: Bearer <token>

Response:
{
  "success": true,
  "auditLogs": [
    {
      "id": "uuid",
      "action": "Created",
      "performedBy": "uploader@example.com",
      "details": "Document uploaded",
      "createdAt": "2025-10-15T10:30:00Z"
    }
  ]
}
```

#### Delete Document (Uploader)
```http
DELETE /api/documents/:id
Authorization: Bearer <token>
```

### Health Check

```http
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": "2025-10-15T10:30:00Z"
}
```

---

## Usage

### For Uploaders

1. **Sign Up/Login** as Uploader
2. **Upload Document**:
   - Click "Upload Document"
   - Select PDF file
   - Enter document name
   - Assign to signer's email
3. **Track Status** on dashboard
4. **Review Signed Documents**:
   - Click "Review" on signed documents
   - Accept or Reject with reason
5. **View Audit History**:
   - Click three-dot menu → "View History"

### For Signers

1. **Sign Up/Login** as Signer
2. **View Assigned Documents** on dashboard
3. **Sign Document**:
   - Click "Sign Now"
   - Draw signature on canvas
   - Enter name (email auto-filled)
   - Submit
4. **Track Status** of signed documents

### Database Management

```bash
# Reset database (truncate all tables)
npm run reset-db

# Seed with test data
npm run seed

# View database in GUI
npx prisma studio
```

---

## Deployment

### Backend Deployment (Railway/Render/Heroku)

1. **Set Environment Variables**:
   - All variables from `.env`
   - Change `DATABASE_URL` to PostgreSQL connection string
   - Update `FRONTEND_URL` to production URL

2. **Database Migration**:
```bash
npx prisma migrate deploy
```

3. **Build Command**:
```bash
npm install && npx prisma generate
```

4. **Start Command**:
```bash
npm start
```

### Frontend Deployment (Vercel/Netlify)

1. **Set Environment Variables**:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.com`

2. **Build Command**:
```bash
npm run build
```

3. **Output Directory**: `.next`

### Production Checklist

- [ ] Update `JWT_SECRET` to secure random string
- [ ] Configure AWS S3 CORS for production domain
- [ ] Update `FRONTEND_URL` in backend `.env`
- [ ] Enable HTTPS/SSL
- [ ] Set up PostgreSQL database (replace SQLite)
- [ ] Configure email service (production SMTP)
- [ ] Add rate limiting to API endpoints
- [ ] Enable production error logging
- [ ] Set up CI/CD pipeline
- [ ] Configure backup strategy

---

## Key Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| JWT Authentication | ✅ | Secure token-based auth |
| OTP Verification | ✅ | Email-based signup verification |
| Role-Based Access | ✅ | UPLOADER / SIGNER roles |
| PDF Upload | ✅ | AWS S3 cloud storage |
| Digital Signature | ✅ | Canvas-based signature capture |
| PDF Embedding | ✅ | Signature overlay with pdf-lib |
| Document Review | ✅ | Accept/Reject workflow |
| Audit Logging | ✅ | Complete action history |
| Email Notifications | ✅ | Nodemailer integration |
| Session Management | ✅ | Device/browser/IP tracking |
| Mobile Responsive | ✅ | Optimized for all devices |
| Dashboard Stats | ✅ | Real-time role-based metrics |
| Database Reset | ✅ | npm run reset-db utility |
| API Documentation | ✅ | Swagger UI integration |

---

## Contributing

Contributions are welcome! To contribute to SignFlow:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and structure
- Write clear commit messages
- Add comments for complex logic
- Update documentation as needed
- Test thoroughly before submitting PR

---

## License

MIT License - feel free to use this project for your own purposes.

Copyright (c) 2025 Vivek Singh

---

## Author

**Vivek Singh**
- GitHub: [@reachvivek](https://github.com/reachvivek)
- LinkedIn: [Vivek Singh](https://linkedin.com/in/reachvivek)

For questions or collaboration opportunities, feel free to reach out!

---

## Acknowledgments

- **Next.js Team** - React framework
- **Prisma Team** - Database toolkit
- **Vercel** - Deployment platform
- **AWS** - Cloud infrastructure
- **Tailwind CSS** - Styling framework

---

<div align="center">

**Built using Next.js, Node.js, and AWS**

Star this repo if you found it helpful!

</div>
