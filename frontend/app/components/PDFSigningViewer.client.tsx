import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import DraggableSignature from "./DraggableSignature";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Props {
  documentId: string;
  documentName: string;
  onProcessingChange: (processing: boolean) => void;
}

// Helper to download PDF
function downloadURI(uri: string, name: string) {
  const link = document.createElement("a");
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function PDFSigningViewer({ documentId, documentName, onProcessingChange }: Props) {
  const documentRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<any>(null);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [signatureURL, setSignatureURL] = useState<string | null>(null);
  const [signatureDialogVisible, setSignatureDialogVisible] = useState(false);
  const [position, setPosition] = useState<any>(null);
  const [pageNum, setPageNum] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageDetails, setPageDetails] = useState<any>(null);
  const [SigCanvas, setSigCanvas] = useState<any>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Load signature canvas on client side only
  useEffect(() => {
    import("react-signature-canvas").then((m) => setSigCanvas(() => m.default));
  }, []);

  // Load PDF from API
  useEffect(() => {
    const loadPdf = async () => {
      setIsLoadingPdf(true);
      setPdfError(null);

      try {
        console.log('[PDFViewer] Fetching pre-signed URL for document:', documentId);

        // First, get the pre-signed URL from backend
        const response = await fetch(`/api/documents/${documentId}/view`);
        const data = await response.json();

        console.log('[PDFViewer] Response from backend:', { success: data.success, hasUrl: !!data.url });

        if (data.success && data.url) {
          console.log('[PDFViewer] Fetching PDF from S3...');

          // Now fetch the actual PDF from S3 using the pre-signed URL
          const pdfResponse = await fetch(data.url);

          if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF from S3: ${pdfResponse.statusText}`);
          }

          const blob = await pdfResponse.blob();
          const url = URL.createObjectURL(blob);

          console.log('[PDFViewer] PDF loaded successfully');
          setPdfUrl(url);
          setIsLoadingPdf(false);
        } else {
          const errorMsg = data.error || 'Failed to get PDF URL';
          console.error('[PDFViewer] Error:', errorMsg);
          setPdfError(errorMsg);
          setIsLoadingPdf(false);
        }
      } catch (error: any) {
        console.error('[PDFViewer] Failed to load PDF:', error);
        setPdfError(error.message || 'Failed to load PDF');
        setIsLoadingPdf(false);
      }
    };

    loadPdf();
  }, [documentId]);

  const handleAddSignature = () => {
    if (!sigRef.current) return;
    if (sigRef.current.isEmpty?.()) {
      alert("Please draw your signature");
      return;
    }
    const dataUrl = sigRef.current.toDataURL();
    setSignatureURL(dataUrl);
    setSignatureDialogVisible(false);
  };

  const handleSetSignature = async () => {
    if (!pdfUrl || !pageDetails || !position) return;

    onProcessingChange(true);
    try {
      const { originalHeight, originalWidth } = pageDetails;
      const scale = originalWidth / (documentRef.current?.clientWidth || 1);

      const y =
        (documentRef.current?.clientHeight || 0) -
        (position.y - position.offsetY + 64 - (documentRef.current?.offsetTop || 0));
      const x = position.x - 160 - position.offsetX - (documentRef.current?.offsetLeft || 0);

      // new XY in relation to actual document size
      const newY = (y * originalHeight) / (documentRef.current?.clientHeight || 1);
      const newX = (x * originalWidth) / (documentRef.current?.clientWidth || 1);

      const pdfDoc = await PDFDocument.load(pdfUrl);
      const pages = pdfDoc.getPages();
      const targetPage = pages[pageNum];

      const pngImage = await pdfDoc.embedPng(signatureURL!);
      const pngDims = pngImage.scale(scale * 0.3);

      targetPage.drawImage(pngImage, {
        x: newX,
        y: newY,
        width: pngDims.width,
        height: pngDims.height,
      });

      // Add timestamp
      const now = new Date();
      const timestamp = `Signed ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      targetPage.drawText(timestamp, {
        x: newX,
        y: newY - 10,
        size: 14 * scale,
        color: rgb(0.074, 0.545, 0.262),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const newUrl = URL.createObjectURL(blob);

      setPdfUrl(newUrl);
      setPosition(null);
      setSignatureURL(null);
      onProcessingChange(false);
    } catch (error) {
      console.error("Failed to embed signature:", error);
      alert("Failed to embed signature. Please try again.");
      onProcessingChange(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      downloadURI(pdfUrl, `${documentName}_signed.pdf`);
    }
  };

  const handleReset = () => {
    setPdfUrl(null);
    setSignatureURL(null);
    setPosition(null);
  };

  return (
    <>
      {/* Signature Dialog */}
      {signatureDialogVisible && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSignatureDialogVisible(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Escape' && setSignatureDialogVisible(false)}
            aria-label="Close dialog"
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Add Signature</h2>
            <div className="border-2 border-blue-500 rounded-lg inline-block">
              {SigCanvas && (
                <SigCanvas
                  ref={sigRef}
                  canvasProps={{
                    width: 600,
                    height: 200,
                    className: "signature-canvas",
                  }}
                />
              )}
            </div>
            <div className="text-center text-blue-600 mt-2 text-sm">
              Draw your signature above
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => sigRef.current?.clear()}
                className="btn-secondary flex-1"
              >
                Clear
              </button>
              <button
                onClick={() => setSignatureDialogVisible(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSignature}
                className="btn-primary flex-1"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-3">
        {!signatureURL && (
          <button
            onClick={() => setSignatureDialogVisible(true)}
            className="btn-primary"
          >
            Add Signature
          </button>
        )}
        <button
          onClick={handleReset}
          className="btn-secondary"
        >
          Reset
        </button>
        {pdfUrl && (
          <button
            onClick={handleDownload}
            className="btn-primary bg-green-600 hover:bg-green-700"
          >
            Download Signed PDF
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoadingPdf && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-700 font-medium">Loading PDF from AWS S3...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {pdfError && !isLoadingPdf && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">Failed to Load PDF</h3>
          <p className="text-red-700">{pdfError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn-secondary"
          >
            Retry
          </button>
        </div>
      )}

      {/* PDF Viewer */}
      {pdfUrl && !isLoadingPdf && !pdfError && (
        <div>
          <div
            ref={documentRef}
            className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white mx-auto"
            style={{ maxWidth: 800 }}
          >
            {signatureURL && (
              <DraggableSignature
                url={signatureURL}
                onCancel={() => setSignatureURL(null)}
                onSet={handleSetSignature}
                onEnd={setPosition}
              />
            )}
            <Document
              file={pdfUrl}
              onLoadSuccess={(data: any) => setTotalPages(data.numPages)}
              loading={
                <div className="flex items-center justify-center py-20">
                  <div className="text-gray-600">Rendering PDF...</div>
                </div>
              }
            >
              <Page
                pageNumber={pageNum + 1}
                width={800}
                onLoadSuccess={(data: any) => setPageDetails(data)}
              />
            </Document>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPageNum(Math.max(0, pageNum - 1))}
                disabled={pageNum === 0}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-700">
                Page {pageNum + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPageNum(Math.min(totalPages - 1, pageNum + 1))}
                disabled={pageNum === totalPages - 1}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
