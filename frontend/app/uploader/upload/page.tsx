"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { API_ENDPOINTS } from "../../config/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function UploadDocument() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [assignTo, setAssignTo] = useState("signer@example.com");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<{
    documentName?: string;
    file?: string;
    assignTo?: string;
  }>({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login?role=uploader");
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setPreview("");
      setFileName("");
      setFile(null);
      return;
    }

    setFileName(selectedFile.name);
    setFile(selectedFile);

    // Create preview URL
    try {
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    } catch (error) {
      console.error("Failed to create preview URL:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    // Validation
    const errors: typeof fieldErrors = {};

    if (!documentName || documentName.trim().length < 3) {
      errors.documentName = "Document name must be at least 3 characters";
    }

    if (!assignTo || !assignTo.includes("@")) {
      errors.assignTo = "Please enter a valid email";
    }

    if (!file) {
      errors.file = "Please select a PDF file";
    } else if (!file.type.includes("pdf")) {
      errors.file = "Only PDF files allowed";
    } else if (file.size > 10 * 1024 * 1024) {
      errors.file = "File must be less than 10MB";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login?role=uploader");
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("name", documentName);
      formData.append("assignedTo", assignTo);
      formData.append("file", file);

      const response = await fetch(API_ENDPOINTS.DOCUMENT_UPLOAD, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        console.log("Document uploaded:", data.document);
        router.push("/uploader");
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />

      {/* Processing Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-6 max-w-md w-full mx-4 shadow-2xl">
            {/* Animated Document Icon */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center animate-pulse">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {/* Spinning ring around icon */}
              <div className="absolute inset-0 w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-2xl animate-spin"></div>
            </div>

            {/* Progress bar */}
            <div className="w-full">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-progress"></div>
              </div>
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 mb-2">Processing Document</p>
              <p className="text-gray-600">Uploading and preparing your file...</p>
            </div>

            {/* Animated dots */}
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Upload Document</h1>
        <p className="text-gray-600 mb-8">Upload a PDF and assign it to a signer</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: File Upload */}
            <div className="space-y-6">
              <div className="card">
                <label className="block font-medium mb-4">PDF Document *</label>

                <input
                  type="file"
                  name="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-600
                    file:mr-4 file:py-3 file:px-6
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700
                    file:cursor-pointer cursor-pointer"
                  required
                />

                {fieldErrors.file && (
                  <p className="mt-2 text-sm text-red-600">{fieldErrors.file}</p>
                )}

                {fileName && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm font-medium text-green-800">✓ {fileName}</p>
                  </div>
                )}
              </div>

              {/* PDF Preview */}
              {preview && (
                <div className="card overflow-hidden">
                  <div className="bg-blue-600 text-white px-4 py-2 font-medium">
                    PDF Preview
                  </div>
                  <iframe
                    src={preview}
                    className="w-full h-[500px]"
                    title="PDF Preview"
                  />
                </div>
              )}
            </div>

            {/* Right: Form */}
            <div className="space-y-6">
              <div className="card space-y-4">
                <h2 className="text-xl font-bold">Document Details</h2>

                <div>
                  <label htmlFor="documentName" className="block font-medium mb-2">
                    Document Name *
                  </label>
                  <input
                    id="documentName"
                    name="documentName"
                    type="text"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="input w-full"
                    placeholder="e.g., Employment Contract"
                    required
                  />
                  {fieldErrors.documentName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.documentName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="assignTo" className="block font-medium mb-2">
                    Assign to Signer *
                  </label>
                  <input
                    id="assignTo"
                    name="assignTo"
                    type="email"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="input w-full"
                    placeholder="signer@example.com"
                    required
                  />
                  {fieldErrors.assignTo && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.assignTo}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    "Upload & Assign"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/uploader")}
                  disabled={loading}
                  className="btn-secondary w-full disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {preview && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> This PDF will be securely stored in the cloud.
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
