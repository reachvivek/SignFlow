import { useState } from "react";

interface PDFViewerProps {
  pdfUrl: string;
  documentName?: string;
  className?: string;
}

export default function PDFViewer({ pdfUrl, documentName = "Document", className = "" }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!pdfUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center min-h-[600px] flex flex-col items-center justify-center ${className}`}>
        <svg
          className="w-32 h-32 text-gray-400 mb-4"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-gray-600 text-lg font-medium mb-2">
          No PDF available
        </p>
        <p className="text-gray-500 text-sm">
          The PDF URL is missing or invalid
        </p>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10">
          <svg
            className="w-12 h-12 text-primary-600 animate-spin mb-4"
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-600 text-sm">Loading PDF...</p>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 z-10 p-8">
          <svg
            className="w-16 h-16 text-red-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-600 text-lg font-medium mb-2">
            Failed to load PDF
          </p>
          <p className="text-gray-500 text-sm mb-4">
            The PDF could not be loaded. Please try again.
          </p>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm"
          >
            Open PDF in New Tab
          </a>
        </div>
      )}

      <iframe
        src={pdfUrl}
        title={documentName}
        className="w-full min-h-[600px] border-0"
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: isLoading || hasError ? 'none' : 'block' }}
      />

      {!isLoading && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 to-transparent p-4">
          <div className="flex items-center justify-between">
            <p className="text-white text-sm font-medium truncate flex-1">
              {documentName}
            </p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 px-3 py-1 bg-white text-gray-900 rounded-md text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              Open Full View
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
