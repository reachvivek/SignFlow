# Frontend API Integration Complete! ✅

## What Was Implemented

### 1. API Client Integration ✅
- **Generated TypeScript Client** from `swagger.yaml`
- **Type-Safe API calls** with full IntelliSense support
- **Custom ApiClient wrapper** for easy usage

### 2. Authentication with JWT Tokens ✅
- **Secure Cookie Storage** using httpOnly cookies
- **Server-Side Session Management** with Remix
- **Automatic Token Expiry Tracking** with cookies
- **Token Decode** to extract user role and expiry

### 3. Automatic Logout on Token Expiry ✅
- **Client-Side Token Monitor** checks every minute
- **Automatic Logout** when token expires
- **Redirect to Login** with expiry message
- **Preserves Intended Destination** with redirectTo parameter

### 4. Real API Integration ✅
- **Login Route** now calls real backend API
- **Error Handling** with user-friendly messages
- **Session Creation** with token storage in cookies
- **Logout Route** clears cookies and redirects

## File Structure

```
frontend/
├── app/
│   ├── config/
│   │   └── api.ts                       # API configuration
│   ├── utils/
│   │   ├── session.server.ts            # Server-side session management
│   │   ├── api.server.ts                # API client utilities
│   │   └── token-monitor.client.ts      # Client-side token monitoring
│   ├── components/
│   │   └── TokenMonitor.tsx             # Token monitoring component
│   ├── routes/
│   │   ├── login.tsx                    # ✅ Updated with real API
│   │   └── logout.tsx                   # ✅ Updated with session destroy
│   ├── root.tsx                         # ✅ Includes TokenMonitor
│   └── api/generated/                   # Auto-generated API client
│       ├── apis/                        # API methods
│       ├── models/                      # TypeScript interfaces
│       └── index.ts                     # ApiClient wrapper
```

## How It Works

### 1. User Login Flow

```typescript
// frontend/app/routes/login.tsx

1. User submits login form
2. Remix action calls backend API:
   ```typescript
   const api = createApiClient();
   const response = await api.auth.apiAuthLoginPost({
     apiAuthLoginPostRequest: { email, password, role }
   });
   ```
3. Backend returns JWT token
4. Token stored in httpOnly cookie:
   ```typescript
   await createUserSession(response.token, '/uploader');
   ```
5. User redirected to dashboard
```

### 2. Token Storage

```typescript
// frontend/app/utils/session.server.ts

// Two cookies created:
1. auth_token - Contains JWT (httpOnly, secure)
2. auth_token_expiry - Contains expiry timestamp

// Security:
- httpOnly: true (prevents XSS attacks)
- secure: true (HTTPS only in production)
- sameSite: 'lax' (CSRF protection)
- maxAge: 7 days
```

### 3. Token Expiry Monitoring

```typescript
// frontend/app/utils/token-monitor.client.ts

1. Checks token expiry every 60 seconds
2. Reads expiry from cookie
3. Compares with current time
4. If expired:
   - Triggers automatic logout
   - Redirects to /login?expired=true
   - Shows expiry message
```

### 4. Protected Routes

```typescript
// Any route that needs authentication:

export async function loader({ request }: LoaderFunctionArgs) {
  // Require authentication
  const token = await requireAuth(request);

  // Create API client with token
  const api = createApiClient(token);

  // Make authenticated API calls
  const documents = await api.documents.apiDocumentsGet();

  return json({ documents });
}
```

### 5. Role-Based Access

```typescript
// Require specific role:

export async function loader({ request }: LoaderFunctionArgs) {
  // Only uploaders can access
  const token = await requireRole(request, 'UPLOADER');

  const api = createApiClient(token);
  // ... uploader-specific logic
}
```

## API Client Usage Examples

### Login

```typescript
const api = createApiClient();
const response = await api.auth.apiAuthLoginPost({
  apiAuthLoginPostRequest: {
    email: 'uploader@example.com',
    password: 'password123',
    role: 'uploader'
  }
});

console.log(response.token); // JWT token
console.log(response.user);  // User object
```

### Get Documents

```typescript
const api = createApiClient(token);
const response = await api.documents.apiDocumentsGet({
  status: 'PENDING' // optional filter
});

console.log(response.documents); // Array of documents
```

### Upload Document

```typescript
const api = createApiClient(token);
const response = await api.documents.apiDocumentsUploadPost({
  name: 'Employment Contract',
  assignedTo: 'signer@example.com',
  file: pdfFile // File from input[type="file"]
});

console.log(response.document); // Uploaded document
```

### Sign Document

```typescript
const api = createApiClient(token);
const response = await api.documents.apiDocumentsIdSignPost({
  id: documentId,
  apiDocumentsIdSignPostRequest: {
    signatureData: 'data:image/png;base64,iVBORw0KG...'
  }
});

console.log(response.document?.status); // 'SIGNED'
```

## Session Management Functions

### Server-Side (session.server.ts)

```typescript
// Create session after login
await createUserSession(token, redirectTo);

// Get token from request
const token = await getToken(request);

// Check if token expired
const isExpired = await isTokenExpired(request);

// Get user session
const session = await getUserSession(request);

// Require authentication
const token = await requireAuth(request);

// Require specific role
const token = await requireRole(request, 'UPLOADER');

// Logout/destroy session
await destroyUserSession(request);
```

### Client-Side (token-monitor.client.ts)

```typescript
// Check if token expired
const expired = isTokenExpiredClient();

// Start monitoring
const cleanup = startTokenMonitoring(onExpiredCallback);

// Get time until expiry
const seconds = getTimeUntilExpiry(); // returns number or null

// Format time until expiry
const timeStr = formatTimeUntilExpiry(); // "2 days" or "5 hours"
```

## Security Best Practices Implemented

### ✅ HttpOnly Cookies
- Prevents JavaScript access to tokens
- Protects against XSS attacks
- Tokens only readable by server

### ✅ Secure Cookies (Production)
- HTTPS only in production
- Prevents man-in-the-middle attacks

### ✅ SameSite Protection
- `sameSite: 'lax'` setting
- Protects against CSRF attacks

### ✅ Token Expiry Monitoring
- Client-side monitoring every minute
- Automatic logout on expiry
- Prevents stale token usage

### ✅ Server-Side Validation
- All protected routes check token
- Token validated on every request
- Expired tokens rejected

### ✅ Role-Based Access Control
- JWT contains user role
- Server validates role for protected actions
- Unauthorized access blocked

## Error Handling

### API Errors

```typescript
try {
  const response = await api.auth.apiAuthLoginPost({...});
} catch (error) {
  const apiError = handleApiError(error);
  // apiError.error - User-friendly message
  // apiError.status - HTTP status code
}
```

### Session Expiry

```typescript
// Automatic redirect with message
/login?expired=true&redirectTo=/uploader/dashboard

// User sees: "Your session has expired. Please sign in again."
```

### Connection Errors

```typescript
// If backend is down
{
  error: "Unable to connect to server. Please check your connection.",
  status: 503
}
```

## Testing

### Test Login

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open: `http://localhost:3000/login?role=uploader`
4. Credentials:
   - Email: `uploader@example.com`
   - Password: `password123`
5. Should redirect to `/uploader` dashboard

### Test Token Expiry

1. Login as uploader
2. Open browser DevTools > Application > Cookies
3. Find `auth_token_expiry` cookie
4. Change value to past timestamp (e.g., `1000000`)
5. Wait 60 seconds
6. Should automatically logout and redirect

### Test Logout

1. Login as any user
2. Click logout button (when integrated)
3. Should clear cookies
4. Redirect to `/login`
5. Cookies should be empty

## Next Steps

### Update Document Routes

Now that authentication is working, update document routes:

**Uploader Dashboard:**
- `app/routes/uploader._index.tsx`
- Use `requireRole(request, 'UPLOADER')`
- Call `api.documents.apiDocumentsGet()` in loader

**Signer Dashboard:**
- `app/routes/signer._index.tsx`
- Use `requireRole(request, 'SIGNER')`
- Call `api.documents.apiDocumentsGet()` in loader

**Upload Route:**
- `app/routes/uploader.upload.tsx`
- Use `createApiClient(token)` in action
- Call `api.documents.apiDocumentsUploadPost()`

**Sign Route:**
- `app/routes/signer.sign.$id.tsx`
- Use `createApiClient(token)` in action
- Call `api.documents.apiDocumentsIdSignPost()`

### Add User Context

Create a user context to access current user throughout app:

```typescript
// app/contexts/user.tsx
import { createContext, useContext } from 'react';

const UserContext = createContext<User | null>(null);

export function useUser() {
  return useContext(UserContext);
}
```

## Configuration

### API Base URL

```typescript
// app/config/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
  // ...
};
```

Set environment variable:
```bash
# .env
API_BASE_URL=http://localhost:5000
```

### Cookie Settings

```typescript
// app/utils/session.server.ts
const tokenCookie = createCookie('auth_token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/',
});
```

## Troubleshooting

### "Unable to connect to server"
- Check backend is running: `cd backend && npm run dev`
- Verify API_BASE_URL in `app/config/api.ts`
- Check CORS settings in backend

### Token Not Persisting
- Check browser cookies in DevTools
- Verify `httpOnly` and `secure` settings
- Check cookie `maxAge` setting

### Automatic Logout Not Working
- Check `TokenMonitor` is rendered in `root.tsx`
- Verify `auth_token_expiry` cookie exists
- Check browser console for errors

### "Invalid credentials"
- Verify backend is seeded: `cd backend && npm run seed`
- Check test credentials match backend
- Look at backend logs for errors

## Summary

✅ **Authentication** - Real API integration with JWT
✅ **Session Management** - Secure cookie storage
✅ **Token Monitoring** - Automatic expiry detection
✅ **Auto Logout** - Logs out on token expiry
✅ **Error Handling** - User-friendly error messages
✅ **Type Safety** - Full TypeScript support
✅ **Security** - HttpOnly, Secure, SameSite cookies
✅ **Best Practices** - Following Remix and security standards

**The frontend is now connected to the real backend API!** 🚀

Next: Update document routes to replace mock data with real API calls.
