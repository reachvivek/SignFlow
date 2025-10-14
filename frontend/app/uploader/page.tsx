"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";
import { API_ENDPOINTS } from "../config/api";
import DocumentReviewModal from "../components/DocumentReviewModal";
import AuditLogModal from "../components/AuditLogModal";
import { useToast } from "../contexts/ToastContext";
import { useModal } from "../contexts/ModalContext";

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
}

export default function UploaderDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const { showConfirm } = useModal();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingDocumentId, setReviewingDocumentId] = useState<string | null>(null);
  const [auditLogDocumentId, setAuditLogDocumentId] = useState<string | null>(null);
  const [auditLogDocumentName, setAuditLogDocumentName] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchDocuments = () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(API_ENDPOINTS.DOCUMENTS, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDocuments(data.documents || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);

      // Verify user is an uploader
      if (parsedUser.role !== "UPLOADER") {
        router.push("/");
        return;
      }

      setUser(parsedUser);
      fetchDocuments();
    } catch (error) {
      // Invalid user data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
    }
  }, [router]);

  const handleDeleteDocument = (documentId: string, documentName: string) => {
    showConfirm(
      "Delete Document",
      `Are you sure you want to delete "${documentName}"? This action cannot be undone.`,
      async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}/${documentId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();
          if (data.success) {
            showToast("Document deleted successfully!", "success");
            fetchDocuments();
          } else {
            showToast(data.error || "Failed to delete document", "error");
          }
        } catch (error) {
          console.error("Error deleting document:", error);
          showToast("Failed to delete document", "error");
        }
      }
    );
  };

  const handleViewAuditLog = (documentId: string, documentName: string) => {
    setAuditLogDocumentId(documentId);
    setAuditLogDocumentName(documentName);
    setOpenMenuId(null);
  };

  const stats = {
    pending: documents.filter((d) => d.status?.toLowerCase() === "pending").length,
    signed: documents.filter((d) => d.status?.toLowerCase() === "signed").length,
    verified: documents.filter((d) => d.status?.toLowerCase() === "verified").length,
    rejected: documents.filter((d) => d.status?.toLowerCase() === "rejected").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Uploader Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and track your document workflows</p>
          </div>
          <Link href="/uploader/upload" className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap">
            <span>+ Upload Document</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="text-yellow-400 text-4xl">⏳</div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Awaiting Review</p>
                <p className="text-3xl font-bold text-blue-600">{stats.signed}</p>
              </div>
              <div className="text-blue-400 text-4xl">📝</div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-3xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <div className="text-green-400 text-4xl">✅</div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <div className="text-red-400 text-4xl">❌</div>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">All Documents ({documents.length})</h2>
          {documents.length > 0 ? (
            documents.map((doc) => (
              <div key={doc.id} className="card hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{doc.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 truncate">Assigned to: {doc.assignedTo}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap self-center ${
                        doc.status?.toLowerCase() === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : doc.status?.toLowerCase() === "signed"
                          ? "bg-blue-100 text-blue-800"
                          : doc.status?.toLowerCase() === "verified"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {doc.status}
                    </span>
                    <Link
                      href={`/uploader/preview/${doc.id}`}
                      className="btn-secondary text-sm sm:text-base text-center whitespace-nowrap"
                    >
                      Preview
                    </Link>
                    {doc.status?.toLowerCase() === "signed" && (
                      <button
                        onClick={() => setReviewingDocumentId(doc.id)}
                        className="btn-primary bg-blue-600 hover:bg-blue-700 text-sm sm:text-base whitespace-nowrap"
                      >
                        Review
                      </button>
                    )}

                    {/* Three-dot menu */}
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {openMenuId === doc.id && (
                        <>
                          {/* Backdrop to close menu */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />

                          {/* Menu dropdown */}
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                            <button
                              onClick={() => handleViewAuditLog(doc.id, doc.name)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-t-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              View History
                            </button>
                            <button
                              onClick={() => {
                                setOpenMenuId(null);
                                handleDeleteDocument(doc.id, doc.name);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Document
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card text-center py-12">
              <p className="text-4xl mb-4">📄</p>
              <p className="text-gray-600 text-lg">No documents yet. Upload your first document to get started!</p>
            </div>
          )}
        </div>
      </div>

      {/* Document Review Modal */}
      {reviewingDocumentId && (
        <DocumentReviewModal
          documentId={reviewingDocumentId}
          onClose={() => setReviewingDocumentId(null)}
          onSuccess={() => {
            fetchDocuments();
            setReviewingDocumentId(null);
          }}
        />
      )}

      {/* Audit Log Modal */}
      {auditLogDocumentId && (
        <AuditLogModal
          documentId={auditLogDocumentId}
          documentName={auditLogDocumentName}
          onClose={() => {
            setAuditLogDocumentId(null);
            setAuditLogDocumentName("");
          }}
        />
      )}
    </div>
  );
}
