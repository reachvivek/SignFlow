import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  readonly onSave: (signature: string) => void;
  readonly width?: number;
  readonly height?: number;
  readonly penColor?: string;
  readonly backgroundColor?: string;
}

export default function SignatureCanvas({
  onSave,
  width = 400,
  height = 200,
  penColor = "#000000",
  backgroundColor = "#ffffff",
}: Props) {
  const [isClient, setIsClient] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [preview, setPreview] = useState<string>("");
  const sigRef = useRef<any>(null);
  const [SigCanvas, setSigCanvas] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import on client only to avoid SSR issues
    import("react-signature-canvas").then((m) => setSigCanvas(() => m.default)).catch(() => setSigCanvas(null));
  }, []);

  const canvasProps = useMemo(
    () => ({
      width,
      height,
      className: "signature-canvas w-full h-full",
    }),
    [width, height]
  );

  const handleClear = () => {
    if (!sigRef.current) return;
    (sigRef.current as any).clear();
    setIsEmpty(true);
    setPreview("");
    onSave("");
  };

  const handleSave = (close: () => void) => {
    if (!sigRef.current) return;
    if (sigRef.current.isEmpty && sigRef.current.isEmpty()) {
      alert("Please sign before saving");
      return;
    }
    const dataUrl: string = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
    setPreview(dataUrl);
    onSave(dataUrl);
    close();
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setIsOpen(true)}
        >
          {preview ? "Edit Signature" : "Add Signature"}
        </button>
        {preview && (
          <img
            src={preview}
            alt="Signature preview"
            className="h-12 object-contain border rounded bg-white p-1"
          />
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 1000 }}>
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-lg overflow-hidden" style={{ width: Math.max(320, width + 32) }}>
            <div className="px-4 py-3 border-b">
              <p className="font-medium">Draw your signature</p>
            </div>
            <div className="p-4">
              <div className="relative border-2 border-gray-200 rounded-lg bg-white" style={{ width, height }}>
                {SigCanvas ? (
                  <SigCanvas
                    ref={sigRef}
                    {...({ penColor, backgroundColor } as any)}
                    canvasProps={canvasProps}
                    // @ts-ignore - onBegin exists on instance
                    onBegin={() => setIsEmpty(false)}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-sm text-gray-500">
                    Loading signature pad...
                  </div>
                )}
                {isEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-400 text-sm">Sign here</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn-secondary flex-1" onClick={() => { handleClear(); }}>
                  Clear
                </button>
                <button type="button" className="btn-primary flex-1" onClick={() => handleSave(() => setIsOpen(false))}>
                  Save
                </button>
                <button type="button" className="btn-outline flex-1" onClick={() => setIsOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

