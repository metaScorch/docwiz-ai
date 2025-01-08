"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Editor from "@/components/Editor";
import { formatDistanceToNow } from "date-fns";
import { use } from "react";
import LoadingModal from "@/components/LoadingModal";
import { redirect } from "next/navigation";
import { UpgradeModal } from "@/components/UpgradeModal";

export default function EditorPage({ params }) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.documentId;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [userDocument, setUserDocument] = useState(null);
  const [content, setContent] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [, setForceUpdate] = useState(0);
  const [isFormatting, setIsFormatting] = useState(false);
  const [featureCounts, setFeatureCounts] = useState({
    amendments: 0,
    autoformat: 0,
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(null);

  const formatRelativeTime = (dateString) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  useEffect(() => {
    async function fetchDocumentAndSubscription() {
      try {
        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) return;

        // First get user's registration
        const { data: registration } = await supabase
          .from("registrations")
          .select("id")
          .eq("user_id", session.user.id)
          .single();

        if (!registration) return;

        // Then check subscription status using registration_id
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("status, plan")
          .eq("registration_id", registration.id)
          .single();

        // Set subscription status
        setHasActiveSubscription(
          subscription?.status === "active" && subscription?.plan !== "free"
        );

        // Fetch document data
        const { data: document } = await supabase
          .from("user_documents")
          .select("*")
          .eq("id", documentId)
          .single();

        if (document) {
          setUserDocument(document);
          setContent(document.content);
          // Only set feature counts if no active subscription
          if (!hasActiveSubscription) {
            setFeatureCounts({
              amendments: document.amendments_count || 0,
              autoformat: document.autoformat_count || 0,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    fetchDocumentAndSubscription();
  }, [documentId, supabase, hasActiveSubscription]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setForceUpdate((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(intervalId);
  }, [router]);

  const handleContentChange = async (newContent) => {
    const newTimestamp = new Date().toISOString();
    setContent(newContent);
    setUserDocument((prev) => ({
      ...prev,
      updated_at: newTimestamp,
    }));

    const { error } = await supabase
      .from("user_documents")
      .update({
        content: newContent,
        updated_at: newTimestamp,
      })
      .eq("id", documentId);

    if (error) {
      console.error("Error updating document:", error);
    }
  };

  const handleTitleChange = async (newTitle) => {
    const newTimestamp = new Date().toISOString();

    const { error } = await supabase
      .from("user_documents")
      .update({
        title: newTitle,
        updated_at: newTimestamp,
      })
      .eq("id", documentId);

    if (error) {
      console.error("Error updating document title:", error);
      return;
    }

    setUserDocument((prev) => ({
      ...prev,
      title: newTitle,
      updated_at: newTimestamp,
    }));
    setIsEditingTitle(false);
  };

  const updateFeatureCount = async (feature) => {
    // Skip count update if user has active subscription
    if (hasActiveSubscription) return;

    const countField =
      feature === "amendments" ? "amendments_count" : "autoformat_count";
    const newCount = featureCounts[feature] + 1;

    const { error } = await supabase
      .from("user_documents")
      .update({ [countField]: newCount })
      .eq("id", documentId);

    if (!error) {
      setFeatureCounts((prev) => ({
        ...prev,
        [feature]: newCount,
      }));
    }
  };

  const handleImproveFormatting = async (currentContent) => {
    // Skip limit check if user has active subscription
    if (!hasActiveSubscription) {
      const AUTOFORMAT_LIMIT = 3;
      if (featureCounts.autoformat >= AUTOFORMAT_LIMIT) {
        setCurrentFeature("autoformat");
        setShowUpgradeModal(true);
        return null;
      }
    }

    setIsFormatting(true);
    try {
      const response = await fetch("/api/improve-formatting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentContent }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Only update count if not subscribed and formatting was successful
      if (!hasActiveSubscription && data.formattedContent) {
        await updateFeatureCount("autoformat");
      }

      return data.formattedContent;
    } catch (error) {
      console.error("Error improving formatting:", error);
      return null;
    } finally {
      setIsFormatting(false);
    }
  };

  const handleCancelFormatting = () => {
    setIsFormatting(false);
  };

  if (!userDocument) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col mb-6">
        <div className="flex items-center justify-between">
          {isEditingTitle ? (
            <input
              type="text"
              className="text-3xl font-bold bg-transparent border-b border-gray-300 focus:outline-none focus:border-primary w-2/3"
              value={userDocument.title}
              onChange={(e) =>
                setUserDocument((prev) => ({ ...prev, title: e.target.value }))
              }
              onBlur={() => handleTitleChange(userDocument.title)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTitleChange(userDocument.title);
                } else if (e.key === "Escape") {
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
            />
          ) : (
            <>
              <h1
                className="text-3xl font-bold cursor-pointer hover:opacity-80"
                onClick={() => setIsEditingTitle(true)}
              >
                {userDocument.title}
              </h1>
            </>
          )}
          <div className="space-x-4">
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
            <Button
              onClick={() =>
                router.push(`/editor/document/${documentId}/preview`)
              }
            >
              Next
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          <span>Created {formatRelativeTime(userDocument.created_at)}</span>
          <span className="mx-2">•</span>
          <span>Last edited {formatRelativeTime(userDocument.updated_at)}</span>
        </div>
      </div>

      <Editor
        content={content}
        onChange={handleContentChange}
        documentId={documentId}
        onImproveFormatting={handleImproveFormatting}
        featureCounts={featureCounts}
        onUpdateFeatureCount={updateFeatureCount}
        setCurrentFeature={setCurrentFeature}
        setShowUpgradeModal={setShowUpgradeModal}
      />

      <div className="mt-4 text-sm text-muted-foreground bg-muted p-3 rounded-md">
        ℹ️ A dedicated signature page will be automatically added at the end of
        your document - no need to add signature fields manually
      </div>

      <LoadingModal isOpen={isFormatting} onCancel={handleCancelFormatting} />

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        limit={currentFeature === "amendments" ? 3 : 3}
        feature={currentFeature}
        currentCount={currentFeature ? featureCounts[currentFeature] : 0}
      />
    </div>
  );
}
