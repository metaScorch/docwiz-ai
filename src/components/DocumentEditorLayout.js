import React, { useState, useEffect } from "react";
import Editor from "@/components/Editor";
import Sidebar from "@/components/Sidebar";
import DocumentChat from "@/components/DocumentChat";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelRightClose, Loader2 } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";

export default function DocumentEditorLayout({
  documentId,
  initialContent,
  isPdfDocument = false,
}) {
  const [content, setContent] = useState(initialContent || "");
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [documentValues, setDocumentValues] = useState({});
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) return;

      setIsLoading(true);
      try {
        const { data: document, error } = await supabase
          .from("user_documents")
          .select("*")
          .eq("id", documentId)
          .single();

        if (error) throw error;

        setContent(document.content);
        if (document.placeholder_values) {
          setDocumentValues(document.placeholder_values);
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, supabase]);

  const handleContentChange = async (newContent) => {
    setContent(newContent);

    try {
      const { error } = await supabase
        .from("user_documents")
        .update({
          content: newContent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving document:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="DocWiz Logo"
            width={180}
            height={60}
            priority
            className="h-auto mb-4"
          />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading your document...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Left Sidebar - Chat */}
      <div
        className={`w-80 flex-shrink-0 transition-all duration-300 ease-in-out ${
          showLeftSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DocumentChat documentId={documentId} documentContent={content} />
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 relative">
          {/* Left Sidebar Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-2 z-10"
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>

          {/* Right Sidebar Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 z-10"
            onClick={() => setShowRightSidebar(!showRightSidebar)}
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>

          {/* Editor */}
          <Editor
            content={content}
            onChange={handleContentChange}
            documentId={documentId}
          />
        </div>
      </div>

      {/* Right Sidebar - Document Fields */}
      <div
        className={`w-80 flex-shrink-0 transition-all duration-300 ease-in-out ${
          showRightSidebar ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <Sidebar
          documentValues={documentValues}
          onValueChange={(name, value) => {
            setDocumentValues((prev) => ({
              ...prev,
              [name]: { ...prev[name], value },
            }));
          }}
        />
      </div>
    </div>
  );
}
