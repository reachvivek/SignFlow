"use client";

import { useRef, useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFDocument, rgb } from "pdf-lib";
import Draggable from "react-draggable";
import SignatureCanvas from "react-signature-canvas";
import dayjs from "dayjs";
import { API_ENDPOINTS } from "../config/api";
import { useToast } from "../contexts/ToastContext";

// Configure PDF.js worker - use jsdelivr CDN (has proper CORS headers)
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

// Helper functions
function blobToURL(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
      resolve(reader.result as string);
    };
  });
}

interface Props {
  documentId: string;
  documentName: string;
}

export default function PDFSigningApp({ documentId, documentName }: Props) {
  const { showToast } = useToast();
  const [pdf, setPdf] = useState<string | null>(null);
  const [signatureURL, setSignatureURL] = useState<string | null>(null);
  const [position, setPosition] = useState<any>(null);
  const [signatureDialogVisible, setSignatureDialogVisible] = useState(false);
  const [pageNum, setPageNum] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageDetails, setPageDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedPdfBlob, setSignedPdfBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History management for undo functionality
  const [pdfHistory, setPdfHistory] = useState<Array<{ pdf: string; blob: Blob | null }>>([]);
  const [originalPdf, setOriginalPdf] = useState<string | null>(null);

  // Text fields
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signingDate] = useState(dayjs().format("MM/DD/YYYY"));
  const [textFieldDialogVisible, setTextFieldDialogVisible] = useState<"name" | "email" | "date" | null>(null);
  const [textPosition, setTextPosition] = useState<any>(null);

  // Draggable text field states
  const [nameFieldActive, setNameFieldActive] = useState(false);
  const [nameFieldPosition, setNameFieldPosition] = useState<any>(null);
  const [emailFieldActive, setEmailFieldActive] = useState(false);
  const [emailFieldPosition, setEmailFieldPosition] = useState<any>(null);
  const [dateFieldActive, setDateFieldActive] = useState(false);
  const [dateFieldPosition, setDateFieldPosition] = useState<any>(null);

  // Custom text field
  const [customTextDialogVisible, setCustomTextDialogVisible] = useState(false);
  const [customTextInput, setCustomTextInput] = useState("");
  const [customTextActive, setCustomTextActive] = useState(false);
  const [customTextPosition, setCustomTextPosition] = useState<any>(null);

  const documentRef = useRef<HTMLDivElement>(null);
  const sigRef = useRef<SignatureCanvas>(null);
  const draggableRef = useRef<HTMLDivElement>(null);
  const nameDraggableRef = useRef<HTMLDivElement>(null);
  const emailDraggableRef = useRef<HTMLDivElement>(null);
  const dateDraggableRef = useRef<HTMLDivElement>(null);
  const customTextDraggableRef = useRef<HTMLDivElement>(null);

  // Load user data and PDF on mount
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setSignerEmail(user.email);
      setSignerName(user.name || "");
    }
  }, []);

  // Load PDF on mount - get base64 from backend and convert to blob
  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");

        if (!token) {
          setError("Please log in to view this document");
          setLoading(false);
          return;
        }

        console.log("📥 Fetching PDF from backend...");
        // Get the PDF as base64 from backend
        const response = await fetch(API_ENDPOINTS.DOCUMENT_VIEW(documentId), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get document: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          console.log("✅ Received base64 PDF, converting to blob...");
          // Convert base64 to blob
          const binaryString = atob(data.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: data.mimeType || 'application/pdf' });

          // Convert blob to data URL for react-pdf
          const url = await blobToURL(blob);
          console.log("✅ PDF loaded successfully");
          setPdf(url);
          setOriginalPdf(url); // Save original PDF for history
          setLoading(false);
        } else {
          setError(data.error || "Failed to load PDF");
          setLoading(false);
        }
      } catch (err: any) {
        console.error("❌ Failed to load PDF:", err);
        setError(err.message || "Failed to load PDF");
        setLoading(false);
      }
    };

    loadPDF();
  }, [documentId]);

  // Save current state to history before making changes
  const saveToHistory = () => {
    if (pdf && signedPdfBlob) {
      setPdfHistory(prev => [...prev, { pdf, blob: signedPdfBlob }]);
    }
  };

  // Undo last action
  const handleUndo = () => {
    if (pdfHistory.length === 0) {
      showToast("Nothing to undo", "info");
      return;
    }

    // Get the last state from history
    const lastState = pdfHistory[pdfHistory.length - 1];

    // Restore the last state
    setPdf(lastState.pdf);
    setSignedPdfBlob(lastState.blob);

    // Remove the last state from history
    setPdfHistory(prev => prev.slice(0, -1));

    showToast("Last action undone", "success");
  };

  const handleAddSignature = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      showToast("Please draw your signature", "warning");
      return;
    }
    const sigURL = sigRef.current.toDataURL();
    setSignatureURL(sigURL);
    setSignatureDialogVisible(false);
  };


  // Handle text field embedding (Name, Email, Date)
  const handleSetTextField = async (fieldType: "name" | "email" | "date") => {
    if (!pdf || !pageDetails) {
      showToast("Please wait for PDF to load", "warning");
      return;
    }

    let fieldPosition, fieldText;
    if (fieldType === "name") {
      if (!signerName) {
        showToast("Please enter your name", "warning");
        return;
      }
      fieldPosition = nameFieldPosition || { x: 100, y: 300 };
      fieldText = signerName;
    } else if (fieldType === "email") {
      fieldPosition = emailFieldPosition || { x: 100, y: 350 };
      fieldText = signerEmail;
    } else {
      fieldPosition = dateFieldPosition || { x: 100, y: 400 };
      fieldText = signingDate;
    }

    try {
      console.log(`🖊️ Embedding ${fieldType} at position:`, fieldPosition);

      const { originalHeight, originalWidth } = pageDetails;

      if (!documentRef.current) {
        throw new Error("Document ref not available");
      }

      // Get the scale factor between display and actual PDF
      const scaleX = originalWidth / 800;
      const scaleY = originalHeight / documentRef.current.clientHeight;

      // Get draggable position
      const dragX = fieldPosition.x || 0;
      const dragY = fieldPosition.y || 0;

      // Convert to PDF coordinates (PDF origin is bottom-left, screen is top-left)
      const pdfX = dragX * scaleX;
      const pdfY = originalHeight - (dragY * scaleY) - (20 * scaleY); // Subtract text height

      const pdfDoc = await PDFDocument.load(pdf);
      const pages = pdfDoc.getPages();
      const targetPage = pages[pageNum];

      targetPage.drawText(fieldText, {
        x: pdfX,
        y: pdfY,
        size: 12,
        color: rgb(0, 0, 0),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const URL = await blobToURL(blob);

      // Save current state to history before updating
      saveToHistory();

      // Update the PDF preview and store the signed blob
      setPdf(URL);
      setSignedPdfBlob(blob);

      // Reset field states
      if (fieldType === "name") {
        setNameFieldActive(false);
        setNameFieldPosition(null);
      } else if (fieldType === "email") {
        setEmailFieldActive(false);
        setEmailFieldPosition(null);
      } else {
        setDateFieldActive(false);
        setDateFieldPosition(null);
      }

      console.log(`✅ ${fieldType} field embedded!`);
      showToast(`${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)} field added successfully`, "success");
    } catch (error) {
      console.error(`Failed to embed ${fieldType} field:`, error);
      showToast(`Failed to embed ${fieldType} field`, "error");
    }
  };

  // Handle custom text confirmation from dialog
  const handleAddCustomText = () => {
    if (!customTextInput.trim()) {
      showToast("Please enter some text", "warning");
      return;
    }
    setCustomTextActive(true);
    setCustomTextDialogVisible(false);
  };

  // Handle custom text field embedding
  const handleSetCustomText = async () => {
    if (!pdf || !pageDetails || !customTextInput) {
      showToast("Please wait for PDF to load or enter text", "warning");
      return;
    }

    const fieldPosition = customTextPosition || { x: 150, y: 450 };

    try {
      console.log("🖊️ Embedding custom text at position:", fieldPosition);

      const { originalHeight, originalWidth } = pageDetails;

      if (!documentRef.current) {
        throw new Error("Document ref not available");
      }

      const scaleX = originalWidth / 800;
      const scaleY = originalHeight / documentRef.current.clientHeight;

      const dragX = fieldPosition.x || 0;
      const dragY = fieldPosition.y || 0;

      const pdfX = dragX * scaleX;
      const pdfY = originalHeight - (dragY * scaleY) - (20 * scaleY);

      const pdfDoc = await PDFDocument.load(pdf);
      const pages = pdfDoc.getPages();
      const targetPage = pages[pageNum];

      targetPage.drawText(customTextInput, {
        x: pdfX,
        y: pdfY,
        size: 12,
        color: rgb(0, 0, 0),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const URL = await blobToURL(blob);

      // Save current state to history before updating
      saveToHistory();

      setPdf(URL);
      setSignedPdfBlob(blob);
      setCustomTextActive(false);
      setCustomTextPosition(null);
      setCustomTextInput("");

      console.log("✅ Custom text embedded!");
      showToast("Custom text added successfully", "success");
    } catch (error) {
      console.error("Failed to embed custom text:", error);
      showToast("Failed to embed custom text", "error");
    }
  };

  const handleSetSignature = async () => {
    if (!pdf || !pageDetails || !signatureURL) {
      showToast("Please position the signature on the document", "warning");
      return;
    }

    // If no position set (signature not moved), use center position
    const finalPosition = position || { x: 300, y: 200, node: null };

    try {
      console.log("🖊️ Embedding signature at position:", finalPosition);

      const { originalHeight, originalWidth } = pageDetails;

      if (!documentRef.current) {
        throw new Error("Document ref not available");
      }

      // Get the scale factor between display and actual PDF
      const scaleX = originalWidth / 800; // Fixed width is 800 from <Page width={800} />
      const scaleY = originalHeight / documentRef.current.clientHeight;

      // Get draggable position (already in pixels relative to document container)
      const dragX = finalPosition.x || 0;
      const dragY = finalPosition.y || 0;

      // Convert to PDF coordinates (PDF origin is bottom-left, screen is top-left)
      const pdfX = dragX * scaleX;
      const pdfY = originalHeight - (dragY * scaleY) - (60 * scaleY); // Subtract signature height

      console.log("📏 Coordinates:", {
        dragPosition: { x: dragX, y: dragY },
        pdfDimensions: { width: originalWidth, height: originalHeight },
        displayDimensions: { width: 800, height: documentRef.current.clientHeight },
        scale: { x: scaleX, y: scaleY },
        finalPdfCoords: { x: pdfX, y: pdfY }
      });

      const pdfDoc = await PDFDocument.load(pdf);
      const pages = pdfDoc.getPages();
      const targetPage = pages[pageNum];

      const pngImage = await pdfDoc.embedPng(signatureURL);

      // Fixed signature size (adjust as needed)
      const sigWidth = 120;
      const sigHeight = 60;

      targetPage.drawImage(pngImage, {
        x: pdfX,
        y: pdfY,
        width: sigWidth,
        height: sigHeight,
      });

      // Add timestamp below signature
      const timestamp = `Signed: ${dayjs().format("MM/DD/YYYY HH:mm")}`;
      targetPage.drawText(timestamp, {
        x: pdfX,
        y: pdfY - 15,
        size: 10,
        color: rgb(0.3, 0.3, 0.3), // Grey color instead of green
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const URL = await blobToURL(blob);

      // Save current state to history before updating
      saveToHistory();

      // Update the PDF preview and store the signed blob
      setPdf(URL);
      setSignedPdfBlob(blob);
      setPosition(null);
      setSignatureURL(null);

      console.log("✅ Signature embedded! You can now submit or add more signatures.");
      showToast("Signature embedded successfully!", "success");
    } catch (error) {
      console.error("Failed to embed signature:", error);
      showToast("Failed to embed signature", "error");
    }
  };

  const handleSubmitSignedDocument = async () => {
    if (!signedPdfBlob) {
      showToast("Please add and place a signature first", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Please log in to sign the document", "error");
        setIsSubmitting(false);
        return;
      }

      console.log("📤 Uploading signed PDF to backend...");

      // Create FormData to send the signed PDF file
      const formData = new FormData();
      formData.append("signedPdf", signedPdfBlob, `${documentName}_signed.pdf`);
      formData.append("signatureData", "client_side_signature");

      // Send signed PDF to backend
      const response = await fetch(API_ENDPOINTS.DOCUMENT_SIGN(documentId), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Document signed successfully!");
        showToast("Document signed and submitted successfully!", "success");
        setTimeout(() => {
          window.location.href = "/signer";
        }, 1500);
      } else {
        throw new Error(data.error || "Failed to submit signed document");
      }
    } catch (error: any) {
      console.error("❌ Failed to submit signed document:", error);
      showToast(`Failed to submit: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-700 font-medium">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading PDF</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Signature Dialog */}
      {signatureDialogVisible && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setSignatureDialogVisible(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Add Signature</h2>
            <div className="border-2 border-blue-500 rounded-lg inline-block">
              <SignatureCanvas
                ref={sigRef}
                velocityFilterWeight={1}
                canvasProps={{
                  width: 600,
                  height: 200,
                  className: "sigCanvas",
                }}
              />
            </div>
            <div className="text-center text-blue-600 mt-2 text-sm">
              Draw your signature above
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => sigRef.current?.clear()} className="btn-secondary flex-1">
                Clear
              </button>
              <button
                onClick={() => setSignatureDialogVisible(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button onClick={handleAddSignature} className="btn-primary flex-1">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Text Dialog */}
      {customTextDialogVisible && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setCustomTextDialogVisible(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Add Custom Text</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your text:
              </label>
              <input
                type="text"
                value={customTextInput}
                onChange={(e) => setCustomTextInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your text here..."
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCustomTextDialogVisible(false);
                  setCustomTextInput("");
                }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button onClick={handleAddCustomText} className="btn-primary flex-1">
                Add to Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          {/* Signature Button */}
          {!signatureURL && !signedPdfBlob && (
            <button onClick={() => setSignatureDialogVisible(true)} className="btn-primary">
              Add Signature
            </button>
          )}

          {signedPdfBlob && !signatureURL && (
            <>
              <button
                onClick={() => setSignatureDialogVisible(true)}
                className="btn-secondary"
              >
                Add Another Signature
              </button>
              <button
                onClick={handleSubmitSignedDocument}
                disabled={isSubmitting}
                className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Signed Document"}
              </button>
            </>
          )}

          {/* Text Field Buttons */}
          {pdf && !signatureURL && (
            <>
              <button
                onClick={() => setNameFieldActive(true)}
                disabled={nameFieldActive}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Name
              </button>
              <button
                onClick={() => setEmailFieldActive(true)}
                disabled={emailFieldActive}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Email
              </button>
              <button
                onClick={() => setDateFieldActive(true)}
                disabled={dateFieldActive}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Date
              </button>
              <button
                onClick={() => setCustomTextDialogVisible(true)}
                disabled={customTextActive}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Custom Text
              </button>
            </>
          )}

          {/* Undo Button */}
          {pdfHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="btn-secondary"
              title="Undo last action"
            >
              Undo
            </button>
          )}

          {/* Reset Button */}
          <button
            onClick={() => {
              setPdf(null);
              setSignatureURL(null);
              setSignedPdfBlob(null);
              setPdfHistory([]);
              setPageNum(0);
              window.location.reload();
            }}
            className="btn-secondary"
          >
            Reset
          </button>
        </div>

        {/* Status indicator */}
        {signedPdfBlob && !isSubmitting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-blue-800 font-medium">
                Signature applied! You can add more signatures or submit the document.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* PDF Viewer */}
      {pdf && (
        <div>
          <div
            ref={documentRef}
            className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white mx-auto"
            style={{ maxWidth: 800 }}
          >
            {signatureURL && (
              <Draggable nodeRef={draggableRef} onStop={(e, data) => setPosition(data)}>
                <div
                  ref={draggableRef}
                  style={{
                    position: "absolute",
                    zIndex: 100000,
                    border: "2px dashed #3b82f6",
                    borderRadius: "8px",
                    cursor: "move",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "-40px",
                      right: 0,
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={handleSetSignature}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Confirm signature placement"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setSignatureURL(null)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Remove signature"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ padding: "4px" }}>
                    <img src={signatureURL} width={200} draggable={false} alt="Signature" />
                  </div>
                </div>
              </Draggable>
            )}

            {/* Name Field Draggable */}
            {nameFieldActive && (
              <Draggable nodeRef={nameDraggableRef} onStop={(e, data) => setNameFieldPosition(data)}>
                <div
                  ref={nameDraggableRef}
                  style={{
                    position: "absolute",
                    zIndex: 100000,
                    border: "2px dashed #f59e0b",
                    borderRadius: "8px",
                    cursor: "move",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                    padding: "8px 16px",
                  }}
                >
                  <div style={{ position: "absolute", top: "-40px", right: 0, display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleSetTextField("name")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Confirm placement"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setNameFieldActive(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#000" }}>
                    {signerName}
                  </div>
                </div>
              </Draggable>
            )}

            {/* Email Field Draggable */}
            {emailFieldActive && (
              <Draggable nodeRef={emailDraggableRef} onStop={(e, data) => setEmailFieldPosition(data)}>
                <div
                  ref={emailDraggableRef}
                  style={{
                    position: "absolute",
                    zIndex: 100000,
                    border: "2px dashed #10b981",
                    borderRadius: "8px",
                    cursor: "move",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                    padding: "8px 16px",
                  }}
                >
                  <div style={{ position: "absolute", top: "-40px", right: 0, display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleSetTextField("email")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Confirm placement"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEmailFieldActive(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#000" }}>
                    {signerEmail}
                  </div>
                </div>
              </Draggable>
            )}

            {/* Date Field Draggable */}
            {dateFieldActive && (
              <Draggable nodeRef={dateDraggableRef} onStop={(e, data) => setDateFieldPosition(data)}>
                <div
                  ref={dateDraggableRef}
                  style={{
                    position: "absolute",
                    zIndex: 100000,
                    border: "2px dashed #8b5cf6",
                    borderRadius: "8px",
                    cursor: "move",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
                    padding: "8px 16px",
                  }}
                >
                  <div style={{ position: "absolute", top: "-40px", right: 0, display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleSetTextField("date")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Confirm placement"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setDateFieldActive(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#000" }}>
                    {signingDate}
                  </div>
                </div>
              </Draggable>
            )}

            {/* Custom Text Field Draggable */}
            {customTextActive && (
              <Draggable nodeRef={customTextDraggableRef} onStop={(e, data) => setCustomTextPosition(data)}>
                <div
                  ref={customTextDraggableRef}
                  style={{
                    position: "absolute",
                    zIndex: 100000,
                    border: "2px dashed #ec4899",
                    borderRadius: "8px",
                    cursor: "move",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 2px 8px rgba(236, 72, 153, 0.3)",
                    padding: "8px 16px",
                  }}
                >
                  <div style={{ position: "absolute", top: "-40px", right: 0, display: "flex", gap: "8px" }}>
                    <button
                      onClick={handleSetCustomText}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Confirm placement"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setCustomTextActive(false);
                        setCustomTextInput("");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        cursor: "pointer",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "20px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "#000" }}>
                    {customTextInput}
                  </div>
                </div>
              </Draggable>
            )}

            <Document
              file={pdf}
              onLoadSuccess={(data) => setTotalPages(data.numPages)}
            >
              <Page
                pageNumber={pageNum + 1}
                width={800}
                onLoadSuccess={(data) => setPageDetails(data)}
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
    </div>
  );
}
