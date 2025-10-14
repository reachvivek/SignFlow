"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";

export default function Home() {
  const router = useRouter();
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: "login" | "signup";
    role: "uploader" | "signer";
  }>({
    isOpen: false,
    mode: "login",
    role: "uploader",
  });

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        const redirectPath = user.role === "UPLOADER" ? "/uploader" : "/signer";
        router.push(redirectPath);
      } catch (error) {
        // Invalid user data, clear storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, [router]);

  const openAuthModal = (
    mode: "login" | "signup",
    role: "uploader" | "signer"
  ) => {
    setAuthModal({ isOpen: true, mode, role });
  };

  const closeAuthModal = () => {
    setAuthModal({ ...authModal, isOpen: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            Welcome to <span className="text-blue-600">SignFlow</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-2">
            Streamline your document signing workflow. Upload, assign, sign, and verify documents with ease.
          </p>
        </div>

        <div className="flex flex-col items-center space-y-4 mb-12 sm:mb-20">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-xl px-2">
            <button
              onClick={() => openAuthModal("login", "uploader")}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              Sign In as Uploader
            </button>
            <button
              onClick={() => openAuthModal("login", "signer")}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg border-2 border-gray-300 transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
            >
              Sign In as Signer
            </button>
          </div>

          <p className="text-sm sm:text-base text-gray-600 px-2">
            New user?{" "}
            <button
              onClick={() => openAuthModal("signup", "uploader")}
              className="text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              Create an account
            </button>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="card text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Upload Documents</h3>
            <p className="text-gray-600">Securely upload and store PDF documents in the cloud</p>
          </div>

          <div className="card text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Digital Signatures</h3>
            <p className="text-gray-600">Sign documents digitally with intuitive tools</p>
          </div>

          <div className="card text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-2">Verify & Track</h3>
            <p className="text-gray-600">Complete audit trails for all document actions</p>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        initialMode={authModal.mode}
        initialRole={authModal.role}
      />
    </div>
  );
}
