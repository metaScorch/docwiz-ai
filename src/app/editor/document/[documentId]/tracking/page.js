"use client";

import { useEffect, useState, use } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import SigningStatus from "./components/SigningStatus";
import Timeline from "./components/Timeline";
import DocumentPreview from "./components/DocumentPreview";
import { formatDistanceToNow } from "date-fns";
import { Loader2, ArrowLeft } from "lucide-react";
import { trackDocumentEvent } from "@/lib/analytics";
import { posthog } from "@/lib/posthog";

export default function TrackingPage({ params }) {
  const documentId = use(params).documentId;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocument() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        return;
      }

      const { data: document, error: documentError } = await supabase
        .from("user_documents")
        .select("*")
        .eq("id", documentId)
        .eq("user_id", user.id)
        .single();

      if (documentError) {
        console.error("Error fetching document:", documentError);
        return;
      }

      setDocument(document);
      setLoading(false);
    }

    fetchDocument();
  }, [documentId, supabase]);

  useEffect(() => {
    if (document?.status) {
      trackDocumentEvent("document_status_changed", document);
    }
  }, [document?.status]);

  // Track page view and document status
  useEffect(() => {
    if (document) {
      posthog.capture("document_tracking_viewed", {
        document_id: documentId,
        document_status: document.status,
        signer_count: document.document?.signers?.length || 0,
        signing_events: document.signing_tracking?.length || 0,
      });
    }
  }, [document, documentId]);

  // Track status changes
  useEffect(() => {
    if (document?.status) {
      posthog.capture("document_status_updated", {
        document_id: documentId,
        new_status: document.status,
        signer_statuses: document.document?.signers?.map((s) => ({
          status: s.status,
          is_completed: s.status === "signed",
        })),
      });
    }
  }, [document?.status, documentId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const documentData = document.document || {};
  const signingTracking = document.signing_tracking || [];

  // Find placeholder values for signers
  const placeholderValues = document.placeholder_values || [];
  const signerPlaceholders = placeholderValues.filter((p) => p.signer);

  // Map signers with their display values
  const signersWithValues = documentData.signers.map((signer) => {
    const placeholder = placeholderValues.find((p) => p.name === signer.name);
    return {
      ...signer,
      displayName: placeholder?.value || signer.name,
      placeholderName: signer.name,
    };
  });

  return (
    <div className="container mx-auto p-6">
      {/* New Logo and Back Section */}
      <div className="mb-8">
        <img src="/logo.png" alt="DocWiz Logo" className="h-8 mb-4" />
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Header Section - Remove the old back button */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{document.title}</h1>
        <div className="text-sm text-muted-foreground mt-2">
          Created{" "}
          {formatDistanceToNow(new Date(documentData.createdAt), {
            addSuffix: true,
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Document Preview */}
        <div className="lg:col-span-2">
          <DocumentPreview document={document} />
        </div>

        {/* Right Column - Status and Timeline */}
        <div className="space-y-6">
          <SigningStatus
            document={document}
            signersWithValues={signersWithValues}
          />
          <Timeline events={signingTracking} />
        </div>
      </div>
    </div>
  );
}
