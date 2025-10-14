"use client";

import { useEffect, useState } from "react";

interface Props {
  url: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentPreview({ url, isOpen, onClose }: Props) {
  if (!isOpen || !url) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Document Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 p-4">
          <iframe
            src={url}
            className="w-full h-full rounded border"
            title="PDF Preview"
          />
        </div>
      </div>
    </div>
  );