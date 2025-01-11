// src/app/analyze/[documentId]/page.js
"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Editor from "@/components/Editor";
import DocumentChat from "@/components/DocumentChat";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, PanelLeftClose, Download, FileText } from "lucide-react";
import Image from "next/image";

export default function AnalyzePage({ params }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const { documentId } = params;

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const { data: doc, error } = await supabase
          .from("user_documents")
          .select("*")
          .eq("id", documentId)
          .single();

        if (error) throw error;

        setDocument(doc);
        setContent(doc.content || "");

        // If document needs processing, trigger it
        if (doc.processing_status === "pending") {
          setIsProcessing(true);
          await processPDF(doc.id);
        }
      } catch (error) {
        console.error("Error fetching document:", error);
        toast.error("Failed to load document");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();

    // Set up real-time subscription for document updates
    const channel = supabase
      .channel(`document_${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_documents",
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          const updatedDoc = payload.new;
          setDocument(updatedDoc);
          setContent(updatedDoc.content || "");
          if (updatedDoc.processing_status === "completed") {
            setIsProcessing(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, supabase]);

  const processPDF = async (docId) => {
    try {
      const response = await fetch("/api/process-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId: docId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process PDF");
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast.error(error.message);
      setIsProcessing(false);
    }
  };

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
      toast.error("Failed to save changes");
    }
  };

  const handleDownloadOriginal = () => {
    if (document?.source_url) {
      window.open(document.source_url, "_blank");
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
            {isProcessing
              ? "Processing PDF document..."
              : "Loading document analysis..."}
          </p>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Chat */}
      <div
        className={`w-96 border-r transform transition-transform duration-200 ease-in-out ${
          showChat ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <DocumentChat documentId={documentId} documentContent={content} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-4 top-4 z-10"
          onClick={() => setShowChat(!showChat)}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>

        {/* Document Title and Actions */}
        <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold">{document.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                PDF Analysis Mode
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleDownloadOriginal}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Original
              </Button>
              <Button onClick={() => router.push("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Editor and Analysis Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4">
            <Card>
              <CardContent className="p-6">
                <Editor
                  content={content}
                  onChange={handleContentChange}
                  documentId={documentId}
                />
              </CardContent>
            </Card>

            {document?.source_url && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>
                  This is an analysis of your PDF document. Changes made here
                  won't affect the original PDF.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
