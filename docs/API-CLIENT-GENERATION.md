# API Client Generation Guide

## Overview

This project uses **OpenAPI Generator** to automatically generate TypeScript API clients for the frontend from the `swagger.yaml` specification. This ensures type-safe API calls and keeps frontend/backend in sync.

## Quick Start

### Generate API Client

```bash
cd backend
npm run generate:client
```

This will:
1. Read `swagger.yaml`
2. Generate TypeScript client code
3. Output to `frontend/app/api/generated/`
4. Create custom `ApiClient` wrapper class

## Generated Files Structure

```
frontend/app/api/generated/
├── apis/
│   ├── AuthenticationApi.ts    # Auth endpoints
│   ├── DocumentsApi.ts          # Document endpoints
│   ├── HealthApi.ts             # Health check
│   └── index.ts
├── models/
│   ├── User.ts                  # User interface
│   ├── Document.ts              # Document interface
│   ├── ErrorResponse.ts         # Error interface
│   └── ... (all request/response types)
├── index.ts                     # Main exports + ApiClient wrapper
├── runtime.ts                   # HTTP client runtime
└── README.md                    # Usage documentation
```

## Usage in Frontend

### 1. Basic Usage with ApiClient Wrapper

```typescript
import { ApiClient } from '~/api/generated';

// Create client instance
const api = new ApiClient('http://localhost:5000');

// Login
const response = await api.auth.apiAuthLoginPost({
  apiAuthLoginPostRequest: {
    email: 'uploader@example.com',
    password: 'password123',
    role: 'uploader'
  }
});

console.log(response.token); // JWT token
console.log(response.user);  // User object

// Set token for authenticated requests
api.setToken(response.token);

// Now all requests will include the token
const documents = await api.documents.apiDocumentsGet();
```

### 2. With React/Remix Loader

```typescript
// app/routes/documents.tsx
import { json, LoaderFunctionArgs } from '@remix-run/node';
import { ApiClient } from '~/api/generated';

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await getTokenFromCookie(request);

  const api = new ApiClient('http://localhost:5000', token);
  const documents = await api.documents.apiDocumentsGet();

  return json({ documents: documents.documents });
}
```

### 3. With React/Remix Action

```typescript
// app/routes/login.tsx
import { ActionFunctionArgs, redirect } from '@remix-run/node';
import { ApiClient } from '~/api/generated';

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;

  const api = new ApiClient('http://localhost:5000');

  try {
    const response = await api.auth.apiAuthLoginPost({
      apiAuthLoginPostRequest: { email, password, role }
    });

    // Store token in cookie/session
    return redirect('/dashboard', {
      headers: {
        'Set-Cookie': await createUserSession(response.token)
      }
    });
  } catch (error) {
    return json({ error: 'Invalid credentials' }, { status: 401 });
  }
}
```

### 4. Document Upload with File

```typescript
import { ApiClient } from '~/api/generated';

const api = new ApiClient('http://localhost:5000', token);

// Upload document
const response = await api.documents.apiDocumentsUploadPost({
  name: 'Employment Contract',
  assignedTo: 'signer@example.com',
  file: pdfFile  // File object from input[type="file"]
});

console.log(response.document); // Uploaded document
```

### 5. Sign Document

```typescript
import { ApiClient } from '~/api/generated';

const api = new ApiClient('http://localhost:5000', token);

// Sign document with base64 signature
const response = await api.documents.apiDocumentsIdSignPost({
  id: documentId,
  apiDocumentsIdSignPostRequest: {
    signatureData: 'data:image/png;base64,iVBORw0KG...'
  }
});

console.log(response.document?.status); // 'SIGNED'
```

### 6. Type-Safe Error Handling

```typescript
import { ApiClient } from '~/api/generated';
import type { ErrorResponse } from '~/api/generated';

const api = new ApiClient('http://localhost:5000', token);

try {
  await api.auth.apiAuthLoginPost({
    apiAuthLoginPostRequest: { email, password }
  });
} catch (error) {
  // Type-safe error handling
  const apiError = error as ErrorResponse;
  console.error(apiError.error); // Error message
}
```

## ApiClient Methods

The custom `ApiClient` wrapper provides these methods:

```typescript
class ApiClient {
  constructor(basePath: string, token?: string)

  // Update token for authenticated requests
  setToken(token: string): void

  // Clear authentication token
  clearToken(): void

  // API namespaces
  health: HealthApi
  auth: AuthenticationApi
  documents: DocumentsApi
}
```

## Available API Methods

### Health API
- `healthGet()` - Health check

### Authentication API
- `apiAuthRegisterPost(params)` - Register new user
- `apiAuthLoginPost(params)` - Login user
- `apiAuthMeGet()` - Get current user profile

### Documents API
- `apiDocumentsUploadPost(params)` - Upload PDF (UPLOADER only)
- `apiDocumentsGet(params?)` - Get documents for current user
- `apiDocumentsIdGet(params)` - Get single document by ID
- `apiDocumentsIdSignPost(params)` - Sign document (SIGNER only)
- `apiDocumentsIdVerifyPost(params)` - Verify signed document (UPLOADER only)
- `apiDocumentsIdRejectPost(params)` - Reject document (UPLOADER only)

## TypeScript Interfaces

All request/response types are auto-generated and type-safe:

```typescript
import type {
  User,
  Document,
  ErrorResponse,
  ApiAuthLoginPostRequest,
  ApiAuthRegisterPost201Response,
  ApiDocumentsGet200Response
} from '~/api/generated';

// All types are available for use
const user: User = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'UPLOADER',
  createdAt: new Date().toISOString()
};
```

## When to Regenerate

Regenerate the client whenever you:
1. Add/remove/modify API endpoints
2. Change request/response schemas
3. Update the `swagger.yaml` file

```bash
cd backend
npm run generate:client
```

## Workflow

### 1. Update Backend API

```bash
# Make changes to backend routes
vim backend/routes/auth.js

# Update swagger.yaml to reflect changes
vim backend/swagger.yaml
```

### 2. Regenerate Client

```bash
cd backend
npm run generate:client
```

### 3. Use in Frontend

```typescript
// Frontend automatically has updated types and methods
import { ApiClient } from '~/api/generated';

const api = new ApiClient('http://localhost:5000');
// Use new/updated endpoints with full TypeScript support
```

## Benefits

✅ **Type Safety**: Full TypeScript types for all API calls
✅ **Auto-Complete**: IDE auto-completion for all endpoints
✅ **Always in Sync**: Frontend/backend API contract always matches
✅ **No Manual Typing**: No need to manually write API types
✅ **Compile-Time Errors**: Catch API mismatches at compile time
✅ **Documentation**: Self-documenting API usage

## Troubleshooting

### Error: "Frontend directory not found"

Make sure you're running from the `backend` directory:
```bash
cd backend
npm run generate:client
```

### Error: "swagger.yaml not found"

Make sure `swagger.yaml` exists in the backend directory:
```bash
ls backend/swagger.yaml
```

### Generated files have errors

Try cleaning and regenerating:
```bash
cd backend
rm -rf ../frontend/app/api/generated
npm run generate:client
```

### TypeScript errors in generated code

The generated code should work with TypeScript 4+. If you see errors:
1. Check your `tsconfig.json` settings
2. Make sure you have the latest TypeScript version
3. Regenerate with `npm run generate:client`

## Advanced Usage

### Custom Configuration

Edit `backend/regenerate-swagger.sh` to customize generation:

```bash
# Change output directory
OUTPUT_DIR="../frontend/app/api/generated"

# Add more properties
--additional-properties=\
  supportsES6=true,\
  typescriptThreePlus=true,\
  withInterfaces=true,\
  useSingleRequestParameter=true,\
  modelPropertyNaming=camelCase
```

### Using Raw APIs (Without Wrapper)

```typescript
import { AuthenticationApi, Configuration } from '~/api/generated';

const config = new Configuration({
  basePath: 'http://localhost:5000',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const authApi = new AuthenticationApi(config);
const response = await authApi.apiAuthLoginPost({
  apiAuthLoginPostRequest: { email, password }
});
```

## npm Scripts

```json
{
  "scripts": {
    "generate:client": "bash regenerate-swagger.sh",
    "generate:client:win": "bash regenerate-swagger.sh"
  }
}
```

Both scripts run the same bash script (works on Windows with Git Bash).

## Files

- `backend/swagger.yaml` - OpenAPI specification (source of truth)
- `backend/regenerate-swagger.sh` - Generation script
- `frontend/app/api/generated/` - Generated TypeScript client (do not edit manually)

## Summary

1. **Update** `swagger.yaml` when API changes
2. **Run** `npm run generate:client` to regenerate
3. **Use** `ApiClient` in frontend with full type safety

No more manual API client coding! 🚀
