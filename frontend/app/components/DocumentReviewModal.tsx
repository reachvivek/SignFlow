"use client";

import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../config/api";
import { useToast } from "../contexts/ToastContext";

interface Document {
  id: string;
  name: string;
  status: string;
  assignedTo: string;
  createdAt: string;
  signedAt?: string;
}

interface DocumentReviewModalProps {
  documentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DocumentReviewModal({
  documentId,
  onClose,
  onSuccess,
}: DocumentReviewModalProps) {
  const { showToast } = useToast();
  const [document, setDocument] = useState<Document | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          showToast("Please log in to view documents", "error");
          onClose();
          return;
        }

        // Fetch document details
        const docResponse = await fetch(`${API_ENDPOINTS.DOCUMENTS}/${documentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const docData = await docResponse.json();
        if (!docData.success) {
          throw new Error(docData.error || "Failed to load document");
        }

        setDocument(docData.document);

        // Fetch PDF as base64 and convert to blob URL
        const pdfResponse = await fetch(API_ENDPOINTS.DOCUMENT_VIEW(documentId), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const pdfData = await pdfResponse.json();
        if (pdfData.success && pdfData.data) {
          const binaryString = atob(pdfData.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        }

        setLoading(false);
      } catch (error: any) {
        console.error("Error loading document:", error);
        showToast(error.message || "Failed to load document", "error");
        setLoading(false);
      }
    };

    loadDocument();

    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [documentId]);

  const handleAccept = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}/${documentId}/verify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        showToast("Document accepted successfully!", "success");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        showToast(data.error || "Failed to accept document", "error");
        setProcessing(false);
      }
    } catch (error) {
      console.error("Error accepting document:", error);
      showToast("Failed to accept document", "error");
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionComment.trim()) {
      showToast("Please provide a reason for rejection", "warning");
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}/${documentId}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: rejectionComment }),
      });

      const data = await response.json();
      if (data.success) {
        showToast("Document rejected successfully!", "success");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        showToast(data.error || "Failed to reject document", "error");
        setProcessing(false);
      }
    } catch (error) {
      console.error("Error rejecting document:", error);
      showToast("Failed to reject document", "error");
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative bg-white rounded-lg shadow-2xl w-full h-full max-w-6xl max-h-[90vh] m-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Review Document</h2>
            {document && (
              <p className="text-sm text-gray-600 mt-1">
                {document.name} • Assigned to: {document.assignedTo}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 overflow-hidden p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading document...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-lg border border-gray-300"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-600">Failed to load PDF preview</p>
            </div>
          )}
        </div>

        {/* Rejection Comment Input (shown when rejecting) */}
        {rejecting && (
          <div className="px-6 py-4 border-t border-gray-200 bg-red-50">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Reason for Rejection <span className="text-red-600">*</span>
            </label>
            <textarea
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              placeholder="Please provide a detailed reason for rejecting this document..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={3}
              autoFocus
            />
          </div>
        )}

        {/* Sticky Footer with Action Buttons */}
        <div className="sticky bottom-0 p-6 border-t border-gray-200 bg-white rounded-b-lg">
          {!rejecting ? (
            <div className="flex gap-4">
              <button
                onClick={handleAccept}
                disabled={processing || loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {processing ? "Accepting..." : "Accept Document"}
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={processing || loading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setRejecting(false);
                  setRejectionComment("");
                }}
                disabled={processing}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionComment.trim()}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? "Submitting..." : "Submit Rejection"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
