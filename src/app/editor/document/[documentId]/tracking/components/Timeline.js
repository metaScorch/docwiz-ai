import { format } from "date-fns";
import { Card } from "@/components/ui/card";

export default function Timeline({ events }) {
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case "document_created":
        return "📄";
      case "document_sent":
        return "📤";
      case "document_viewed":
        return "👁️";
      case "document_signed":
        return "✍️";
      case "document_completed":
        return "✅";
      default:
        return "•";
    }
  };

  const formatEventMessage = (event) => {
    const signer = event.signer;

    switch (event.event_type) {
      case "document_created":
        return "Document created";
      case "document_sent":
        return "Document sent for signing";
      case "document_viewed":
        return signer ? `Viewed by ${signer.name}` : "Document viewed";
      case "document_signed":
        return signer ? `Signed by ${signer.name}` : "Document signed";
      case "document_completed":
        return "Document completed";
      default:
        return event.event_type.replace(/_/g, " ");
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
              <span className="text-xl">{getEventIcon(event.event_type)}</span>
            </div>
            <div className="flex-grow">
              <p className="text-sm font-medium">{formatEventMessage(event)}</p>
              <time className="text-xs text-gray-500">
                {format(new Date(event.timestamp), "MMM d, yyyy 'at' h:mm a")}
              </time>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
