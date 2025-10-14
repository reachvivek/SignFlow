#!/bin/bash
# Re-generates the TypeScript API client for frontend from swagger.yaml

set -e  # Exit on any error

echo "================================================"
echo "  PDF Signing API - Client Generation"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SWAGGER_FILE="./swagger.yaml"
OUTPUT_DIR="../frontend/app/api/generated"
FRONTEND_DIR="../frontend"

# Check if swagger.yaml exists
if [ ! -f "$SWAGGER_FILE" ]; then
    echo -e "${RED}Error: swagger.yaml not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found swagger.yaml"

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found frontend directory"

# Clean old generated files
if [ -d "$OUTPUT_DIR" ]; then
    echo -e "${YELLOW}→${NC} Cleaning old generated files..."
    rm -rf "$OUTPUT_DIR"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo -e "${GREEN}✓${NC} Created output directory: $OUTPUT_DIR"

# Generate TypeScript Fetch client
echo ""
echo -e "${YELLOW}→${NC} Generating TypeScript API client..."
echo ""

npx @openapitools/openapi-generator-cli generate \
    -i "$SWAGGER_FILE" \
    -g typescript-fetch \
    -o "$OUTPUT_DIR" \
    --additional-properties=supportsES6=true,typescriptThreePlus=true,withInterfaces=true,useSingleRequestParameter=true,modelPropertyNaming=camelCase

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓${NC} TypeScript client generated successfully!"
else
    echo -e "${RED}✗${NC} Failed to generate TypeScript client"
    exit 1
fi

# Create custom barrel export file
echo ""
echo -e "${YELLOW}→${NC} Creating custom barrel exports..."

cat > "$OUTPUT_DIR/index.ts" << 'EOF'
/**
 * PDF Signing API Client
 * Auto-generated from swagger.yaml
 *
 * Usage:
 * import { ApiClient } from './api/generated'
 *
 * const api = new ApiClient('http://localhost:5000')
 * await api.auth.apiAuthLoginPost({ apiAuthLoginPostRequest: { email, password } })
 */

export * from './apis';
export * from './models';
export * from './runtime';

// Custom API Client wrapper
import { Configuration } from './runtime';
import { HealthApi, AuthenticationApi, DocumentsApi } from './apis';

export class ApiClient {
  private basePath: string;
  private token: string | null = null;

  public health: HealthApi;
  public auth: AuthenticationApi;
  public documents: DocumentsApi;

  constructor(basePath: string = 'http://localhost:5000', token?: string) {
    this.basePath = basePath;
    if (token) {
      this.token = token;
    }

    this._initializeApis();
  }

  /**
   * Initialize or reinitialize API instances with current configuration
   */
  private _initializeApis() {
    const config = new Configuration({
      basePath: this.basePath,
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
    });

    this.health = new HealthApi(config);
    this.auth = new AuthenticationApi(config);
    this.documents = new DocumentsApi(config);
  }

  /**
   * Update the authentication token
   */
  setToken(token: string) {
    this.token = token;
    this._initializeApis();
  }

  /**
   * Clear the authentication token
   */
  clearToken() {
    this.token = null;
    this._initializeApis();
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }
}
EOF

echo -e "${GREEN}✓${NC} Created custom barrel exports"

# Create README for generated code
cat > "$OUTPUT_DIR/README.md" << 'EOF'
# Generated API Client

This directory contains auto-generated TypeScript API client from the backend swagger.yaml.

**⚠️ DO NOT EDIT FILES IN THIS DIRECTORY MANUALLY**

All files are auto-generated and will be overwritten when you run:
```bash
cd backend
./regenerate-swagger.sh
```

## Usage

### Basic Usage

```typescript
import { ApiClient } from '~/api/generated';

// Create client instance
const api = new ApiClient('http://localhost:5000');

// Login
const response = await api.auth.apiAuthLoginPost({
  body: {
    email: 'uploader@example.com',
    password: 'password123',
    role: 'uploader'
  }
});

const { token, user } = response;

// Set token for authenticated requests
api.setToken(token);

// Upload document
const doc = await api.documents.apiDocumentsUploadPost({
  name: 'Contract',
  assignedTo: 'signer@example.com',
  file: pdfFile
});
```

### With React/Remix

```typescript
import { ApiClient } from '~/api/generated';
import { useEffect, useState } from 'react';

export default function MyComponent() {
  const [api] = useState(() => new ApiClient('http://localhost:5000'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.setToken(token);
    }
  }, []);

  const handleLogin = async () => {
    const response = await api.auth.apiAuthLoginPost({
      body: {
        email: 'user@example.com',
        password: 'password123'
      }
    });

    api.setToken(response.token);
    localStorage.setItem('token', response.token);
  };

  return <button onClick={handleLogin}>Login</button>;
}
```

## Regenerating

To regenerate this client after making changes to the backend API:

1. Update `backend/swagger.yaml`
2. Run regeneration script:
   ```bash
   cd backend
   ./regenerate-swagger.sh
   ```

## Files

- `apis/` - API endpoint functions
- `models/` - TypeScript interfaces for request/response types
- `runtime.ts` - HTTP client runtime
- `index.ts` - Barrel exports and custom ApiClient wrapper
EOF

echo -e "${GREEN}✓${NC} Created README"

# Summary
echo ""
echo "================================================"
echo -e "${GREEN}  ✓ Generation Complete!${NC}"
echo "================================================"
echo ""
echo "Generated files at: $OUTPUT_DIR"
echo ""
echo "Usage in frontend:"
echo "  import { ApiClient } from '~/api/generated'"
echo "  const api = new ApiClient('http://localhost:5000')"
echo "  await api.auth.apiAuthLoginPost({ body: { email, password } })"
echo ""
echo "To regenerate:"
echo "  cd backend && ./regenerate-swagger.sh"
echo ""
