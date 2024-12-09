"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Editor from "@/components/Editor";

export default function EditorPage({ params }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [userDocument, setUserDocument] = useState(null);
  const [content, setContent] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const { documentId } = params;

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

      setUserDocument(document);
      setContent(document.content);
    }

    fetchDocument();
  }, [documentId, supabase]);

  const handleContentChange = async (newContent) => {
    setContent(newContent);

    const { error } = await supabase
      .from("user_documents")
      .update({
        content: newContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (error) {
      console.error("Error updating document:", error);
    }
  };

  const handleTitleChange = async (newTitle) => {
    const { error } = await supabase
      .from("user_documents")
      .update({
        title: newTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (error) {
      console.error("Error updating document title:", error);
      return;
    }

    setUserDocument((prev) => ({ ...prev, title: newTitle }));
    setIsEditingTitle(false);
  };

  if (!userDocument) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        {isEditingTitle ? (
          <input
            type="text"
            className="text-3xl font-bold bg-transparent border-b border-gray-300 focus:outline-none focus:border-primary"
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
          <Button>Save</Button>
        </div>
      </div>

      <Editor
        content={content}
        onChange={handleContentChange}
        documentId={documentId}
      />
    </div>
  );
}
