// Centralized API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  SEND_OTP: `${API_BASE_URL}/api/auth/send-otp`,
  VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  ME: `${API_BASE_URL}/api/auth/me`,

  // Documents
  DOCUMENTS: `${API_BASE_URL}/api/documents`,
  DOCUMENT_VIEW: (id: string) => `${API_BASE_URL}/api/documents/${id}/view`,
  DOCUMENT_SIGN: (id: string) => `${API_BASE_URL}/api/documents/${id}/sign`,
  DOCUMENT_UPLOAD: `${API_BASE_URL}/api/documents/upload`,
  DOCUMENT_DELETE: (id: string) => `${API_BASE_URL}/api/documents/${id}`,
  DOCUMENT_AUDIT_LOGS: (id: string) => `${API_BASE_URL}/api/documents/${id}/audit-logs`,
};

export default API_BASE_URL;
