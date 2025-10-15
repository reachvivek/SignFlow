"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";
import { API_ENDPOINTS } from "../config/api";
import DocumentReviewModal from "../components/DocumentReviewModal";
import AuditLogModal from "../components/AuditLogModal";
import { useToast } from "../contexts/ToastContext";
import { useModal } from "../contexts/ModalContext";

const getStatusClass = (status: string | undefined) => {
  switch (status?.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "signed":
      return "bg-blue-100 text-blue-800";
    case "verified":
      return "bg-green-100 text-green-800";
    default:
      return "bg-red-100 text-red-800";
  }
};

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

interface Stats {
  pending: number;
  signed: number;
  verified: number;
  rejected: number;
}

export default function UploaderDashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const { showModal } = useModal();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    signed: 0,
    verified: 0,
    rejected: 0
  });
  const [reviewingDocumentId, setReviewingDocumentId] = useState<string | null>(null);
  const [auditLogDocumentId, setAuditLogDocumentId] = useState<string | null>(null);
  const [auditLogDocumentName, setAuditLogDocumentName] = useState<string>("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Filter and pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Debounce timer ref
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  useEffect(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 500); // 500ms debounce

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // API fetch callback for documents
  const fetchDocumentsWithFilters = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      setLoading(true);

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(dateFilter !== "all" && { dateFilter: dateFilter })
      });

      const response = await fetch(`${API_ENDPOINTS.DOCUMENTS}?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents || []);
        setTotalDocuments(data.total || 0);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch, statusFilter, dateFilter, router]);

  // Initial auth check and data fetch
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
      fetchStats();
      fetchDocumentsWithFilters();
    } catch {
      // Invalid user data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
    }
  }, [router, fetchStats, fetchDocumentsWithFilters]);

  // Watch for filter changes
  useEffect(() => {
    if (user) {
      fetchDocumentsWithFilters();
    }
  }, [currentPage, debouncedSearch, statusFilter, dateFilter, user, fetchDocumentsWithFilters]);

  // Reset to page 1 when filters change (not search - handled in debounce)
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter, itemsPerPage]);

  const handleDeleteDocument = (documentId: string, documentName: string) => {
    showModal(
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
            fetchDocumentsWithFilters();
            fetchStats();
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
  };

  // Calculate total pages from API response
  const totalPages = Math.ceil(totalDocuments / itemsPerPage);

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Uploader Dashboard</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Manage and track your document workflows
              </p>
            </div>
            <Link href="/uploader/upload" className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Upload Document</span>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                </div>
                <div className="text-yellow-400 text-4xl">⏳</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Awaiting Review</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.signed}
                  </p>
                </div>
                <div className="text-blue-400 text-4xl">📝</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.verified}
                  </p>
                </div>
                <div className="text-green-400 text-4xl">✅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.rejected}
                  </p>
                </div>
                <div className="text-red-400 text-4xl">❌</div>
              </div>
            </div>
          </div>

          {/* Header with search and filters */}
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search by document name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    className="pl-11 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                  />
                  <svg
                    className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-all"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="signed">Signed</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  <div className="relative">
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-all"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="itemsPerPage" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Show:
                  </label>
                  <div className="relative">
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="appearance-none pl-3 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-all"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setDateFilter('all');
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Documents table */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      #
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Document Name
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-gray-500 text-sm font-medium">No documents found</p>
                          <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc: Document, index: number) => (
                      <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                          {String((currentPage - 1) * itemsPerPage + index + 1).padStart(4, '0')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                              <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{doc.name}</div>
                              <div className="text-xs text-gray-500">PDF Document</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{doc.assignedTo}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(doc.status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(doc.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(doc.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/uploader/preview/${doc.id}`}
                              className="icon-button view"
                              title="Preview Document"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            {doc.status?.toLowerCase() === "signed" && (
                              <button
                                onClick={() => {
                                  setReviewingDocumentId(doc.id);
                                  setOpenMenuId(null);
                                }}
                                className="icon-button sign"
                                title="Review Document"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                              </button>
                            )}

                            {/* Three-dot menu */}
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                                className="icon-button"
                                title="More actions"
                              >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
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
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                                    <button
                                      onClick={() => {
                                        handleViewAuditLog(doc.id, doc.name);
                                        setOpenMenuId(null);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                    >
                                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>View History</span>
                                    </button>
                                    <div className="border-t border-gray-100 my-1"></div>
                                    <button
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleDeleteDocument(doc.id, doc.name);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      <span>Delete Document</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-4 flex items-center justify-between border border-gray-200 rounded-lg shadow-sm sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                    <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, totalDocuments)}</span> of{" "}
                    <span className="font-semibold text-gray-900">{totalDocuments}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-lg shadow-sm gap-1">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="First page"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Previous page"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {/* Page numbers with smart ellipsis */}
                    {(() => {
                      const pages = [];
                      const showEllipsisStart = currentPage > 3;
                      const showEllipsisEnd = currentPage < totalPages - 2;

                      // Always show first page
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className={`relative inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            currentPage === 1
                              ? "bg-blue-600 border-blue-600 text-white shadow-md hover:bg-blue-700"
                              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          1
                        </button>
                      );

                      // Show ellipsis if needed
                      if (showEllipsisStart) {
                        pages.push(
                          <span key="ellipsis-start" className="relative inline-flex items-center px-2 py-2 text-sm text-gray-500">
                            ...
                          </span>
                        );
                      }

                      // Show pages around current page
                      const start = Math.max(2, currentPage - 1);
                      const end = Math.min(totalPages - 1, currentPage + 1);

                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`relative inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                              currentPage === i
                                ? "bg-blue-600 border-blue-600 text-white shadow-md hover:bg-blue-700"
                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }

                      // Show ellipsis if needed
                      if (showEllipsisEnd) {
                        pages.push(
                          <span key="ellipsis-end" className="relative inline-flex items-center px-2 py-2 text-sm text-gray-500">
                            ...
                          </span>
                        );
                      }

                      // Always show last page if more than 1 page
                      if (totalPages > 1) {
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className={`relative inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                              currentPage === totalPages
                                ? "bg-blue-600 border-blue-600 text-white shadow-md hover:bg-blue-700"
                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {totalPages}
                          </button>
                        );
                      }

                      return pages;
                    })()}
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Next page"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      title="Last page"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Document Review Modal */}
      {reviewingDocumentId && (
        <DocumentReviewModal
          documentId={reviewingDocumentId}
          onClose={() => setReviewingDocumentId(null)}
          onSuccess={() => {
            fetchDocumentsWithFilters();
            fetchStats();
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
