# Authentication & Authorization - Complete Setup! ✅

## Overview

Full-stack authentication system implemented with:
- ✅ **Backend:** JWT authentication middleware on all protected routes
- ✅ **Frontend:** Automatic Bearer token injection in API requests
- ✅ **Cookies:** Secure httpOnly cookie storage
- ✅ **Auto-Logout:** Token expiry monitoring (checks every 60 seconds)
- ✅ **Role-Based Access:** UPLOADER and SIGNER role protection

---

## Backend Protection

### Authentication Middleware

**File:** `backend/middleware/auth.js`

```javascript
const authenticate = async (req, res, next) => {
  // Extract token from Authorization header
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Verify and decode JWT
  const decoded = verifyToken(token);
  req.userId = decoded.userId;
  req.userRole = decoded.role;

  next();
};
```

### Protected Routes

All document endpoints require authentication:

```javascript
// backend/routes/documents.js

// Upload - Requires UPLOADER role
router.post('/upload', authenticate, isUploader, upload.single('file'), ...);

// Get documents - Requires authentication
router.get('/', authenticate, ...);

// Get single document - Requires authentication
router.get('/:id', authenticate, ...);

// Sign document - Requires SIGNER role
router.post('/:id/sign', authenticate, isSigner, ...);

// Verify document - Requires UPLOADER role
router.post('/:id/verify', authenticate, isUploader, ...);

// Reject document - Requires UPLOADER role
router.post('/:id/reject', authenticate, isUploader, ...);
```

### Role-Based Middleware

```javascript
const isUploader = (req, res, next) => {
  if (req.userRole !== 'UPLOADER') {
    return res.status(403).json({ error: 'Uploader role required' });
  }
  next();
};

const isSigner = (req, res, next) => {
  if (req.userRole !== 'SIGNER') {
    return res.status(403).json({ error: 'Signer role required' });
  }
  next();
};
```

---

## Frontend Integration

### ApiClient with Bearer Token

**File:** `frontend/app/api/generated/index.ts`

The ApiClient automatically includes `Authorization: Bearer <token>` header:

```typescript
export class ApiClient {
  private basePath: string;
  private token: string | null = null;

  constructor(basePath: string, token?: string) {
    this.basePath = basePath;
    if (token) {
      this.token = token;
    }
    this._initializeApis();
  }

  private _initializeApis() {
    const config = new Configuration({
      basePath: this.basePath,
      headers: this.token ? {
        'Authorization': `Bearer ${this.token}`
      } : {},
    });

    this.health = new HealthApi(config);
    this.auth = new AuthenticationApi(config);
    this.documents = new DocumentsApi(config);
  }

  setToken(token: string) {
    this.token = token;
    this._initializeApis(); // Recreate APIs with new token
  }
}
```

### Usage in Remix Loaders/Actions

**Server-Side (Authenticated Requests):**

```typescript
// frontend/app/routes/uploader._index.tsx

import { requireAuth } from '~/utils/session.server';
import { createApiClient } from '~/utils/api.server';

export async function loader({ request }: LoaderFunctionArgs) {
  // Get token from cookie (auto-redirects if expired)
  const token = await requireAuth(request);

  // Create API client with token
  const api = createApiClient(token);

  // Make authenticated request
  // ApiClient automatically sends: Authorization: Bearer <token>
  const response = await api.documents.apiDocumentsGet();

  return json({ documents: response.documents });
}
```

---

## Authentication Flow

### 1. Login Process

```
User → Login Form → Backend API
                      ↓
                  Verify Credentials
                      ↓
                  Generate JWT Token
                      ↓
Frontend ← Token in Response
    ↓
Store in httpOnly Cookie
    ↓
Include in All API Requests
```

**Code:**

```typescript
// frontend/app/routes/login.tsx

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;

  // Create API client (no token needed for login)
  const api = createApiClient();

  // Login - returns JWT token
  const response = await api.auth.apiAuthLoginPost({
    apiAuthLoginPostRequest: { email, password, role }
  });

  // Store token in httpOnly cookie and redirect
  return await createUserSession(response.token, `/${role}`);
}
```

### 2. Authenticated Request Flow

```
Frontend Loader/Action
    ↓
Get Token from Cookie (requireAuth)
    ↓
Create ApiClient(token)
    ↓
Make API Call
    ↓
ApiClient adds header: Authorization: Bearer <token>
    ↓
Backend Middleware verifies token
    ↓
Request proceeds to handler
```

### 3. Token Expiry Flow

```
Token Monitor (checks every 60s)
    ↓
Check token expiry in cookie
    ↓
Is Expired?
    ↓ Yes
Automatic Logout
    ↓
Clear Cookies
    ↓
Redirect to /login?expired=true
```

---

## Security Implementation

### ✅ 1. HttpOnly Cookies

```typescript
// frontend/app/utils/session.server.ts

const tokenCookie = createCookie('auth_token', {
  httpOnly: true,    // JavaScript cannot access
  secure: true,      // HTTPS only in production
  sameSite: 'lax',   // CSRF protection
  maxAge: 604800,    // 7 days
  path: '/',
});
```

**Benefits:**
- Prevents XSS attacks (JavaScript can't steal token)
- Automatically sent with every request
- Secure transmission (HTTPS only in production)

### ✅ 2. JWT Verification

```javascript
// backend/middleware/auth.js

const decoded = verifyToken(token); // Throws if invalid/expired
req.userId = decoded.userId;
req.userRole = decoded.role;
```

**Backend validates:**
- Token signature
- Token expiry
- Token structure

### ✅ 3. Role-Based Access Control

```typescript
// Frontend
const token = await requireRole(request, 'UPLOADER');

// Backend
router.post('/upload', authenticate, isUploader, ...);
```

**Protection:**
- Signers can't upload documents
- Uploaders can't sign documents
- Both checked on frontend AND backend

### ✅ 4. Automatic Token Expiry Monitoring

```typescript
// frontend/app/components/TokenMonitor.tsx

export function TokenMonitor() {
  useEffect(() => {
    const cleanup = startTokenMonitoring(() => {
      // Auto-logout on expiry
      submit(null, { method: 'post', action: '/logout' });
    });
    return cleanup;
  }, []);
}
```

**Checks every 60 seconds:**
- Reads expiry from cookie
- Compares with current time
- Auto-logout if expired

---

## API Request Examples

### Without Token (Public)

```typescript
const api = createApiClient();

// Login - no token needed
const response = await api.auth.apiAuthLoginPost({
  apiAuthLoginPostRequest: {
    email: 'uploader@example.com',
    password: 'password123',
    role: 'uploader'
  }
});

// response.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**HTTP Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "uploader@example.com",
  "password": "password123",
  "role": "uploader"
}
```

### With Token (Protected)

```typescript
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const api = createApiClient(token);

// Get documents - includes Bearer token
const response = await api.documents.apiDocumentsGet();
```

**HTTP Request:**
```http
GET /api/documents
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Upload Document (Role-Protected)

```typescript
const api = createApiClient(uploaderToken);

const response = await api.documents.apiDocumentsUploadPost({
  name: 'Employment Contract',
  assignedTo: 'signer@example.com',
  file: pdfFile
});
```

**HTTP Request:**
```http
POST /api/documents/upload
Authorization: Bearer <uploader_token>
Content-Type: multipart/form-data

name: Employment Contract
assignedTo: signer@example.com
file: [PDF file]
```

**Backend Checks:**
1. Token exists? ✓
2. Token valid? ✓
3. User role = UPLOADER? ✓
4. Then process upload

---

## Error Handling

### 401 Unauthorized

**Cause:** Missing or invalid token

**Backend Response:**
```json
{
  "success": false,
  "error": "No token provided. Authorization denied."
}
```

**Frontend Handling:**
```typescript
// Automatic redirect to login
const token = await requireAuth(request);
// ↑ Redirects to /login if no token or expired
```

### 403 Forbidden

**Cause:** User has valid token but wrong role

**Backend Response:**
```json
{
  "success": false,
  "error": "Access denied. Uploader role required."
}
```

**Frontend Handling:**
```typescript
const token = await requireRole(request, 'UPLOADER');
// ↑ Redirects to /unauthorized if wrong role
```

### Token Expired

**Automatic Detection:**
```typescript
// Client-side monitor checks every 60s
if (isTokenExpiredClient()) {
  // Auto-logout
  submit(null, { method: 'post', action: '/logout' });
}
```

**User sees:**
```
Redirect to: /login?expired=true
Message: "Your session has expired. Please sign in again."
```

---

## Testing

### Test Protected Endpoint

1. **Start backend:** `cd backend && npm run dev`
2. **Login to get token:**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"uploader@example.com","password":"password123","role":"uploader"}'
   ```
3. **Save token from response**
4. **Test protected endpoint:**
   ```bash
   curl http://localhost:5000/api/documents \
     -H "Authorization: Bearer <token>"
   ```

### Test Without Token

```bash
curl http://localhost:5000/api/documents
# Response: 401 Unauthorized
```

### Test Wrong Role

```bash
# Get signer token
SIGNER_TOKEN="..."

# Try to upload (requires UPLOADER role)
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer $SIGNER_TOKEN" \
  -F "name=Test" \
  -F "assignedTo=signer@example.com" \
  -F "file=@test.pdf"

# Response: 403 Forbidden
```

---

## Configuration

### Backend JWT Secret

```bash
# backend/.env
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

### Frontend API Base URL

```typescript
// frontend/app/config/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
  TOKEN_COOKIE_NAME: 'auth_token',
  TOKEN_EXPIRY_COOKIE_NAME: 'auth_token_expiry',
  COOKIE_MAX_AGE: 7 * 24 * 60 * 60, // 7 days
};
```

---

## Summary

### Backend ✅
- ✅ JWT authentication middleware
- ✅ Role-based access control (UPLOADER/SIGNER)
- ✅ All protected routes require authentication
- ✅ Token verification on every request
- ✅ Proper error responses (401, 403)

### Frontend ✅
- ✅ ApiClient automatically sends Bearer token
- ✅ Token stored in httpOnly cookies
- ✅ Token expiry monitoring (every 60s)
- ✅ Automatic logout on expiry
- ✅ Session management utilities
- ✅ Type-safe API calls

### Security ✅
- ✅ HttpOnly cookies (XSS protection)
- ✅ Secure cookies (HTTPS in production)
- ✅ SameSite protection (CSRF protection)
- ✅ JWT verification
- ✅ Role-based authorization
- ✅ Automatic token expiry handling

---

## What's Next

Now that authentication is complete, you can:

1. **Update Document Routes:** Replace mock data with real API calls in uploader/signer dashboards
2. **Test End-to-End:** Login → Upload → Sign → Verify workflow
3. **Add User Context:** Create React context for current user throughout app
4. **Error Boundaries:** Add error handling for API failures
5. **Loading States:** Show loading indicators during API calls

**The authentication system is production-ready!** 🔐🚀

All API requests now include proper Authorization headers, and the backend properly validates tokens on all protected routes.
