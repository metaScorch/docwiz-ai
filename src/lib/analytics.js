import { posthog } from "./posthog";

export const trackDocumentEvent = (eventName, documentData) => {
  posthog.capture(eventName, {
    document_id: documentData.id,
    document_type: documentData.type,
    template_id: documentData.template_id,
    status: documentData.status,
    signer_count: documentData.document?.signers?.length || 0,
    has_content: !!documentData.content,
    timestamp: new Date().toISOString(),
  });
};

export const trackUserAction = (action, metadata = {}) => {
  posthog.capture(`user_${action}`, {
    ...metadata,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
  });
};
