import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Upload, File } from "lucide-react";
import { toast } from "sonner";
import { ProcessingState } from "./ProcessingState";

export default function PDFUpload({ onClose }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [processingState, setProcessingState] = useState(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }

      try {
        // Start upload phase
        setProcessingState("uploading");
        setProgress(0);

        // Upload to Supabase storage
        const fileName = `documents/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file, {
            onProgress: ({ loaded, total }) => {
              setProgress(Math.round((loaded / total) * 33)); // First third for upload
            },
          });

        if (uploadError) throw uploadError;

        // Get the public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(fileName);

        // Create document record
        const { data: document, error: docError } = await supabase
          .from("user_documents")
          .insert([
            {
              title: file.name.replace(".pdf", ""),
              source_url: publicUrl,
              processing_status: "processing",
              is_pdf: true,
              original_filename: file.name,
            },
          ])
          .select()
          .single();

        if (docError) throw docError;

        // Start processing phase
        setProcessingState("processing");
        setProgress(33);

        // Wait for document processing
        const processResponse = await fetch("/api/process-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: document.id }),
        });

        if (!processResponse.ok) {
          throw new Error("Failed to process document");
        }

        // Update progress during processing
        setProgress(66);
        setProcessingState("analyzing");

        // Poll for document status
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout

        while (attempts < maxAttempts) {
          const { data: updatedDoc, error: checkError } = await supabase
            .from("user_documents")
            .select("processing_status")
            .eq("id", document.id)
            .single();

          if (checkError) throw checkError;

          if (updatedDoc.processing_status === "completed") {
            setProgress(100);

            // Close dialog and navigate to editor
            onClose?.();
            router.push(`/editor/document/${document.id}`);
            toast.success("Document processed successfully");
            return;
          } else if (updatedDoc.processing_status === "failed") {
            throw new Error("Document processing failed");
          }

          // Update progress smoothly during analysis
          setProgress(66 + Math.min((attempts / maxAttempts) * 34, 33));

          // Wait 1 second before next check
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
        }

        throw new Error("Document processing timed out");
      } catch (error) {
        console.error("Upload error:", error);
        setProcessingState("failed");
        toast.error(error.message || "Failed to process document");
      }
    },
    [supabase, router, onClose]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
    disabled: !!processingState,
  });

  if (processingState) {
    return <ProcessingState state={processingState} progress={progress} />;
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-12
        transition-colors duration-200 ease-in-out
        ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
        cursor-pointer hover:border-primary hover:bg-primary/5
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        {isDragActive ? (
          <Upload className="h-8 w-8 text-primary animate-bounce" />
        ) : (
          <File className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragActive ? "Drop your PDF here" : "Drag & drop your PDF here"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse files
          </p>
        </div>
      </div>
    </div>
  );
}
