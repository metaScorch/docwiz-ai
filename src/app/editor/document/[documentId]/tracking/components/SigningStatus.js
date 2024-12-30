import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export default function SigningStatus({ document }) {
  const documentData = document.document || {};
  const signers = documentData.signers || [];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "signed":
        return "bg-green-500";
      case "viewed":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Signing Status</h2>

      {/* Document Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Document Status</span>
          <Badge className={getStatusColor(documentData.documentStatus)}>
            {documentData.documentStatus || "Unknown"}
          </Badge>
        </div>
        <div className="text-sm text-gray-500">
          Last updated:{" "}
          {formatDistanceToNow(new Date(documentData.lastUpdated), {
            addSuffix: true,
          })}
        </div>
      </div>

      {/* Signers List */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Signers</h3>
        {signers.map((signer, index) => (
          <div key={index} className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{signer.name}</span>
              <Badge className={getStatusColor(signer.status)}>
                {signer.status}
              </Badge>
            </div>
            <div className="text-sm text-gray-500">{signer.email}</div>
          </div>
        ))}
      </div>

      {/* Document Links */}
      {documentData.originalPdf && (
        <div className="mt-6 space-y-2">
          <a
            href={documentData.originalPdf}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline block"
          >
            View Original Document
          </a>
          {documentData.signedPdfUrl && (
            <a
              href={documentData.signedPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline block"
            >
              View Signed Document
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
