"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Editor from "@/components/Editor";
import { formatDistanceToNow } from "date-fns";
import { use } from "react";
import LoadingModal from "@/components/LoadingModal";
import { redirect } from "next/navigation";

export default function EditorPage({ params }) {
  const resolvedParams = use(params);
  const documentId = resolvedParams.documentId;
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [userDocument, setUserDocument] = useState(null);
  const [content, setContent] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [, setForceUpdate] = useState(0);
  const [isFormatting, setIsFormatting] = useState(false);

  const formatRelativeTime = (dateString) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

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

      // Fetch the user's document
      const { data: document, error: documentError } = await supabase
        .from("user_documents")
        .select(
          `
          *,
          template:templates(*)
        `
        )
        .eq("id", documentId)
        .eq("user_id", user.id)
        .single();

      if (documentError) {
        console.error("Error fetching document:", documentError);
        return;
      }

      // Redirect to tracking page if document is pending signature or completed
      if (
        document.status === "pending_signature" ||
        document.status === "completed"
      ) {
        router.push(`/editor/document/${documentId}/tracking`);
        return;
      }

      if (document) {
        setUserDocument(document);
        setContent(document.content);
      }
    }

    fetchDocument();
  }, [documentId, supabase]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setForceUpdate((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

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

  const handleImproveFormatting = async (currentContent) => {
    setIsFormatting(true);
    try {
      const response = await fetch("/api/improve-formatting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: currentContent,
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

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
            <h1
              className="text-3xl font-bold cursor-pointer hover:opacity-80"
              onClick={() => setIsEditingTitle(true)}
            >
              {userDocument.title}
            </h1>
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
      />

      <LoadingModal isOpen={isFormatting} onCancel={handleCancelFormatting} />
    </div>
  );
}
