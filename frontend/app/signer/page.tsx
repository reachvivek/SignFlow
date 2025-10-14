"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";
import { API_ENDPOINTS } from "../config/api";

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

export default function SignerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);

      // Verify user is a signer
      if (parsedUser.role !== "SIGNER") {
        router.push("/");
        return;
      }

      setUser(parsedUser);

      // Fetch documents
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
    } catch (error) {
      // Invalid user data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
    }
  }, [router]);

  const stats = {
    pending: documents.filter((d) => d.status?.toLowerCase() === "pending")
      .length,
    signed: documents.filter((d) => d.status?.toLowerCase() === "signed")
      .length,
    verified: documents.filter((d) => d.status?.toLowerCase() === "verified")
      .length,
    rejected: documents.filter((d) => d.status?.toLowerCase() === "rejected")
      .length,
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
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Signer Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            View and sign documents assigned to you
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Awaiting Signature</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
              <div className="text-yellow-400 text-4xl">⏳</div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Signed</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats.signed}
                </p>
              </div>
              <div className="text-blue-400 text-4xl">📝</div>
            </div>
          </div>

          <div className="card">
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

          <div className="card">
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

        {/* Pending Alert */}
        {stats.pending > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-yellow-600 mr-3 text-2xl">⚠️</div>
              <p className="text-yellow-800 font-medium">
                You have {stats.pending} document{stats.pending > 1 ? "s" : ""}{" "}
                waiting for your signature!
              </p>
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            All Documents ({documents.length})
          </h2>
          {documents.length > 0 ? (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{doc.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap self-center ${getStatusClass(
                        doc.status
                      )}`}
                    >
                      {doc.status}
                    </span>
                    {doc.status?.toLowerCase() === "pending" ? (
                      <Link
                        href={`/signer/sign/${doc.id}`}
                        className="btn-primary text-center text-sm sm:text-base whitespace-nowrap"
                      >
                        Sign Now
                      </Link>
                    ) : (
                      <Link
                        href={`/signer/preview/${doc.id}`}
                        className="btn-primary text-center text-sm sm:text-base whitespace-nowrap"
                      >
                        Preview
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card text-center py-12">
              <p className="text-4xl mb-4">📄</p>
              <p className="text-gray-600 text-lg">
                No documents assigned to you yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
