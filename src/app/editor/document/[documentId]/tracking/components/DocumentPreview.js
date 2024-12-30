import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";

export default function DocumentPreview({ document: documentInfo }) {
  const documentData = documentInfo.document || {};
  const pdfUrl = documentData.signedPdfUrl || documentData.originalPdf;

  if (!pdfUrl) {
    return (
      <Card className="p-6 h-full flex items-center justify-center">
        <p className="text-gray-500">No document preview available</p>
      </Card>
    );
  }

  const handleDownload = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Document Preview</h2>
        <div className="space-x-2">
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md inline-flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
      <div className="w-full aspect-[1/1.4] bg-gray-50 rounded-lg overflow-hidden">
        <iframe
          src={`${pdfUrl}#toolbar=0`}
          className="w-full h-full"
          title="Document Preview"
        />
      </div>
    </Card>
  );
}
