# API Testing Guide

Quick guide to test all backend endpoints.

## Base URL
```
http://localhost:5000
```

## Test Credentials

**Uploader**:
- Email: `uploader@example.com`
- Password: `password123`

**Signer**:
- Email: `signer@example.com`
- Password: `password123`

---

## 1. Health Check

```bash
curl http://localhost:5000/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "PDF Signing API is running",
  "timestamp": "2025-10-14T00:00:00.000Z"
}
```

---

## 2. Register User (Optional)

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "uploader"
  }'
```

---

## 3. Login (Get Token)

**As Uploader**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "uploader@example.com",
    "password": "password123",
    "role": "uploader"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "name": "John Uploader",
    "email": "uploader@example.com",
    "role": "UPLOADER"
  }
}
```

**Save the token** - you'll need it for authenticated requests!

---

## 4. Get Current User

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 5. Upload Document (Uploader Only)

```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_UPLOADER_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "name=Employment Contract" \
  -F "assignedTo=signer@example.com"
```

**Expected Response**:
```json
{
  "success": true,
  "document": {
    "id": "doc-uuid",
    "name": "Employment Contract",
    "status": "PENDING",
    ...
  }
}
```

---

## 6. Get All Documents

```bash
# Get all documents for logged-in user
curl -X GET http://localhost:5000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by status
curl -X GET "http://localhost:5000/api/documents?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 7. Get Single Document

```bash
curl -X GET http://localhost:5000/api/documents/DOCUMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. Sign Document (Signer Only)

```bash
curl -X POST http://localhost:5000/api/documents/DOCUMENT_ID/sign \
  -H "Authorization: Bearer YOUR_SIGNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "signatureData": "data:image/png;base64,iVBORw0KG..."
  }'
```

---

## 9. Verify Document (Uploader Only)

```bash
curl -X POST http://localhost:5000/api/documents/DOCUMENT_ID/verify \
  -H "Authorization: Bearer YOUR_UPLOADER_TOKEN"
```

---

## 10. Reject Document (Uploader Only)

```bash
curl -X POST http://localhost:5000/api/documents/DOCUMENT_ID/reject \
  -H "Authorization: Bearer YOUR_UPLOADER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Signature looks invalid"
  }'
```

---

## Complete Workflow Test

1. **Login as Uploader** → Get token
2. **Upload document** → Get document ID
3. **Login as Signer** → Get token
4. **Get documents** → Verify document appears
5. **Sign document** → Provide signature data
6. **Login as Uploader** → Get token
7. **Verify signed document**

---

## Using Thunder Client (VS Code Extension)

1. Install Thunder Client extension
2. Create new requests for each endpoint
3. Save tokens in environment variables
4. Test full workflow

---

## Common Errors

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```
**Solution**: Get a new token by logging in again

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied. Uploader role required."
}
```
**Solution**: Use correct user role for the endpoint

### 404 Not Found
```json
{
  "success": false,
  "error": "Document not found"
}
```
**Solution**: Check document ID is correct

---

## Next Steps

After testing all endpoints:
1. ✅ Backend is working
2. → Integrate with frontend
3. → Test complete flow in UI
4. → Record demo video
