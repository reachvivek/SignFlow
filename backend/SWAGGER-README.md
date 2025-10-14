# Swagger API Documentation

## Quick Start

The API documentation is available via Swagger UI when the server is running.

### Access Swagger UI

1. Start the server:
   ```bash
   npm run dev
   ```

2. Open your browser and go to:
   ```
   http://localhost:5000/api-docs
   ```

## Features

- **Interactive API Testing**: Test all endpoints directly from the browser
- **Complete Documentation**: All 9 endpoints documented with request/response examples
- **Authentication Support**: Built-in JWT authentication testing
- **Request Examples**: Pre-filled examples for all endpoints

## How to Use

### 1. Test Public Endpoints (No Auth Required)

**Health Check:**
- Click on `GET /health`
- Click "Try it out"
- Click "Execute"

**Login:**
- Click on `POST /api/auth/login`
- Click "Try it out"
- Use test credentials:
  ```json
  {
    "email": "uploader@example.com",
    "password": "password123",
    "role": "uploader"
  }
  ```
- Click "Execute"
- Copy the `token` from the response

### 2. Test Protected Endpoints (Auth Required)

**Authenticate in Swagger:**
1. Click the green **"Authorize"** button at the top right
2. Enter: `Bearer <your-token-here>`
   - Example: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Click "Authorize"
4. Click "Close"

**Now you can test protected endpoints:**
- `GET /api/auth/me` - Get current user profile
- `POST /api/documents/upload` - Upload PDF (uploader only)
- `GET /api/documents` - Get documents for current user
- `POST /api/documents/{id}/sign` - Sign document (signer only)
- `POST /api/documents/{id}/verify` - Verify signed document
- `POST /api/documents/{id}/reject` - Reject document

### 3. Test Document Upload

1. Make sure you're authenticated as uploader
2. Click on `POST /api/documents/upload`
3. Click "Try it out"
4. Fill in:
   - `name`: Employment Contract
   - `assignedTo`: signer@example.com
   - `file`: Click "Choose File" and select a PDF
5. Click "Execute"

### 4. Test Document Signing

1. Authenticate as signer (logout and login with `signer@example.com`)
2. Get a document ID from `GET /api/documents`
3. Click on `POST /api/documents/{id}/sign`
4. Click "Try it out"
5. Enter the document ID
6. Paste a base64 signature in the request body:
   ```json
   {
     "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
   }
   ```
7. Click "Execute"

## Swagger File Location

The complete API specification is in:
```
backend/swagger.yaml
```

You can:
- Edit this file to update documentation
- Import it into Postman or Insomnia
- Share it with frontend developers
- Use it to generate client SDKs

## Test Credentials

### Uploader Account
```
Email: uploader@example.com
Password: password123
Role: UPLOADER
```

**Can:**
- Upload documents
- Verify signed documents
- Reject documents
- View uploaded documents

### Signer Account
```
Email: signer@example.com
Password: password123
Role: SIGNER
```

**Can:**
- Sign documents assigned to them
- View assigned documents

## API Endpoints Overview

| Method | Endpoint | Auth Required | Role Required | Description |
|--------|----------|---------------|---------------|-------------|
| GET | `/health` | No | None | Health check |
| POST | `/api/auth/register` | No | None | Register new user |
| POST | `/api/auth/login` | No | None | Login user |
| GET | `/api/auth/me` | Yes | Any | Get current user |
| POST | `/api/documents/upload` | Yes | UPLOADER | Upload PDF |
| GET | `/api/documents` | Yes | Any | Get user's documents |
| GET | `/api/documents/:id` | Yes | Any | Get single document |
| POST | `/api/documents/:id/sign` | Yes | SIGNER | Sign document |
| POST | `/api/documents/:id/verify` | Yes | UPLOADER | Verify signed doc |
| POST | `/api/documents/:id/reject` | Yes | UPLOADER | Reject document |

## Document Status Flow

```
PENDING → SIGNED → VERIFIED
   ↓
REJECTED
```

1. **PENDING**: Document uploaded, awaiting signature
2. **SIGNED**: Signer has signed the document
3. **VERIFIED**: Uploader has verified the signed document
4. **REJECTED**: Uploader has rejected the document (can happen at any stage)

## Tips

- **Clear Authentication**: Click "Logout" in the Authorize dialog to clear token
- **Switch Users**: Logout and login with different credentials to test different roles
- **Copy Document IDs**: After uploading, copy the document ID from the response to use in other endpoints
- **Use Examples**: Most endpoints have pre-filled examples - just click "Try it out" and "Execute"

## Troubleshooting

**"Unauthorized" Error:**
- Make sure you clicked "Authorize" and entered the token with "Bearer " prefix
- Token expires after 7 days - login again to get a new token

**"Forbidden" Error:**
- You're using the wrong role (e.g., signer trying to upload)
- Login with the correct role account

**"Document not found" Error:**
- Check the document ID is correct
- Make sure the document belongs to you or is assigned to you

## Advanced: Export Swagger Spec

To use the API specification elsewhere:

1. **Download YAML:**
   ```bash
   cp backend/swagger.yaml ./pdf-signing-api-spec.yaml
   ```

2. **Import to Postman:**
   - Open Postman → Import → Upload `swagger.yaml`

3. **Import to Insomnia:**
   - Open Insomnia → Create → Import From → File → Select `swagger.yaml`

4. **Generate Client SDK:**
   - Use [OpenAPI Generator](https://openapi-generator.tech/)
   - Supports JavaScript, TypeScript, Python, Java, etc.

## Support

For issues or questions:
- Check server logs in terminal
- Verify server is running on port 5000
- Test with curl first if Swagger UI has issues
- Refer to [ENDPOINT-TEST-RESULTS.md](./ENDPOINT-TEST-RESULTS.md) for curl examples
