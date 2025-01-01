"use client";

import { useEffect, useState, use } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import SigningStatus from "./components/SigningStatus";
import Timeline from "./components/Timeline";
import DocumentPreview from "./components/DocumentPreview";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

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

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const documentData = document.document || {};
  const signingTracking = document.signing_tracking || [];

  return (
    <div className="container mx-auto p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{document.title}</h1>
          <div className="text-sm text-muted-foreground mt-2">
            Created{" "}
            {formatDistanceToNow(new Date(documentData.createdAt), {
              addSuffix: true,
            })}
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Document Preview */}
        <div className="lg:col-span-2">
          <DocumentPreview document={document} />
        </div>

        {/* Right Column - Status and Timeline */}
        <div className="space-y-6">
          <SigningStatus document={document} />
          <Timeline events={signingTracking} />
        </div>
      </div>
    </div>
  );
}
