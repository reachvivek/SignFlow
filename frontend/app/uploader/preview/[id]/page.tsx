"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../../components/Header";
import { API_ENDPOINTS } from "../../../config/api";
import { useToast } from "../../../contexts/ToastContext";
import { useModal } from "../../../contexts/ModalContext";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Document {
  id: string;
  name: string;
  status: string;
  assignedTo: string;
  createdAt: string;
  signedAt?: string;
  s3Url?: string;
}

export default function PreviewDocument() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const { showToast } = useToast();
  const { showConfirm, showPrompt } = useModal();

  const [user, setUser] = useState<User | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login?role=uploader");
      return;
    }

    setUser(JSON.parse(userData));

    // Fetch document details
    fetch(`${API_ENDPOINTS.DOCUMENTS}/${documentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocument(data.document);
          // Get the view URL (pre-signed S3 URL)
          return fetch(API_ENDPOINTS.DOCUMENT_VIEW(documentId), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          throw new Error(data.error || "Failed to load document");
        }
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          // Convert base64 to blob URL for iframe
          const binaryString = atob(data.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } else {
          throw new Error("Failed to get document data");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading document:", err);
        setError(err.message || "Failed to load document");
        setLoading(false);
      });
  }, [documentId, router]);

  const handleVerify = () => {
    showConfirm(
      "Verify Document",
      "Are you sure you want to verify this document? This action confirms the document is valid and properly signed.",
      async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
          const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}/${documentId}/verify`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          const data = await response.json();
          if (data.success) {
            showToast("Document verified successfully!", "success");
            setTimeout(() => router.push("/uploader"), 1500);
          } else {
            showToast(data.error || "Failed to verify document", "error");
          }
        } catch (err) {
          console.error("Error verifying document:", err);
          showToast("Failed to verify document", "error");
        }
      }
    );
  };

  const handleReject = () => {
    showPrompt(
      "Reject Document",
      "Please provide a reason for rejection:",
      "Enter rejection reason...",
      async (reason: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
          const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}/${documentId}/reject`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason }),
          });

          const data = await response.json();
          if (data.success) {
            showToast("Document rejected successfully!", "success");
            setTimeout(() => router.push("/uploader"), 1500);
          } else {
            showToast(data.error || "Failed to reject document", "error");
          }
        } catch (err) {
          console.error("Error rejecting document:", err);
          showToast("Failed to reject document", "error");
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="card bg-red-50 border border-red-200">
            <p className="text-red-800">{error || "Document not found"}</p>
            <button
              onClick={() => router.push("/uploader")}
              className="btn-primary mt-4"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Preview Document</h1>
            <p className="text-gray-600 mt-1">{document.name}</p>
          </div>
          <button
            onClick={() => router.push("/uploader")}
            className="btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* PDF Preview - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Document Preview</h2>
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-[800px] rounded-lg"
                  title="PDF Preview"
                />
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center min-h-[800px] flex flex-col items-center justify-center">
                  <svg
                    className="w-32 h-32 text-red-500 mb-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-gray-600 text-lg font-medium">PDF Document</p>
                  <p className="text-gray-500 text-sm mt-2">{document.name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Document Details - Takes 1 column */}
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Document Information</h2>
              <div className="space-y-3">
                <div className="py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Document Name</span>
                  <p className="font-medium text-gray-900 mt-1">{document.name}</p>
                </div>
                <div className="py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Assigned To</span>
                  <p className="font-medium text-gray-900 mt-1">{document.assignedTo}</p>
                </div>
                <div className="py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Uploaded</span>
                  <p className="font-medium text-gray-900 mt-1">
                    {new Date(document.createdAt).toLocaleDateString()} at {new Date(document.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                {document.signedAt && (
                  <div className="py-2 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Signed</span>
                    <p className="font-medium text-gray-900 mt-1">
                      {new Date(document.signedAt).toLocaleDateString()} at {new Date(document.signedAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
                <div className="py-2">
                  <span className="text-sm text-gray-600">Status</span>
                  <div className="mt-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        document.status?.toLowerCase() === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : document.status?.toLowerCase() === "signed"
                          ? "bg-blue-100 text-blue-800"
                          : document.status?.toLowerCase() === "verified"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {document.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {document.status?.toLowerCase() === "signed" && (
              <>
                <div className="card bg-yellow-50 border-yellow-200">
                  <div className="flex items-start">
                    <svg
                      className="w-6 h-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900">
                        Review Required
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Please carefully review the signed document before verifying or rejecting.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleVerify}
                    className="btn-primary w-full bg-green-600 hover:bg-green-700"
                  >
                    <svg
                      className="w-5 h-5 inline-block mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Verify Document
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="btn-secondary w-full border-2 border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <svg
                      className="w-5 h-5 inline-block mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Reject Document
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
