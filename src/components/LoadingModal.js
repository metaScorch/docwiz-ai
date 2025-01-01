import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function LoadingModal({ isOpen, onCancel }) {
  const [loadingText, setLoadingText] = useState(
    "Analyzing document structure..."
  );

  useEffect(() => {
    if (!isOpen) return;

    const messages = [
      "Analyzing document structure...",
      "Applying agreement best practices...",
      "Enhancing readability...",
      "Polishing final formatting...",
      "Finalizing changes...",
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex += 1;
      if (currentIndex < messages.length) {
        setLoadingText(messages[currentIndex]);
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center w-[400px]">
        <h2 className="text-xl font-semibold mb-4">Formatting using AI</h2>
        <div className="mb-6">
          <Loader2 className="h-10 w-10 animate-spin text-[#0700C7] mx-auto mb-4" />
          <p className="text-gray-600 min-h-[28px]">{loadingText}</p>
        </div>
        <button
          onClick={onCancel}
          className="bg-[#000000] text-white px-6 py-2 rounded hover:bg-[#000000] transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
