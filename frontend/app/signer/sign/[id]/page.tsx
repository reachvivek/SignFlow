"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Header from "../../../components/Header";

// Dynamically import PDFSigningApp with no SSR to avoid DOMMatrix error
const PDFSigningApp = dynamic(() => import("../../../components/PDFSigningApp"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-700 font-medium">Loading PDF Signing Tool...</p>
      </div>
    </div>
  ),
});

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SignDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const documentId = params.id as string;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login?role=signer");
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Sign Document</h1>
          <p className="text-gray-600 mt-1">Draw your signature and drag it to position on the PDF</p>
        </div>

        <PDFSigningApp documentId={documentId} documentName={`Document ${documentId}`} />
      </div>
    </div>
  );
}
