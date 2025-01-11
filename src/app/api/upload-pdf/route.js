// src/app/api/process-pdf/route.js
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import PDFServicesSdk from "@adobe/pdfservices-node-sdk";

// Initialize Adobe credentials
const credentials =
  PDFServicesSdk.Credentials.serviceAccountCredentialsBuilder()
    .withClientId(process.env.ADOBE_CLIENT_ID)
    .withClientSecret(process.env.ADOBE_CLIENT_SECRET)
    .build();

// Create execution context
const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

async function convertPDFToText(pdfUrl) {
  try {
    // Download the PDF file
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error("Failed to fetch PDF");
    const pdfBuffer = await response.arrayBuffer();

    // Create a temporary file from the buffer
    const input = PDFServicesSdk.FileRef.createFromStream(
      Buffer.from(pdfBuffer),
      PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
    );

    // Create the extract PDF operation
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();

    // Configure the operation
    const options =
      new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
        .addElements(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT)
        .build();

    extractPDFOperation.setOptions(options);

    // Execute the operation
    const result = await extractPDFOperation.execute(executionContext);

    // Parse the results
    const extracted = JSON.parse(await result.toString());

    // Convert to markdown format
    let markdown = "";
    if (extracted.elements) {
      extracted.elements.forEach((element) => {
        if (element.Text) {
          // Add basic markdown formatting based on text properties
          if (element.TextSize >= 16) {
            markdown += `# ${element.Text}\n\n`; // Large text as headers
          } else if (element.TextSize >= 14) {
            markdown += `## ${element.Text}\n\n`; // Medium text as subheaders
          } else {
            markdown += `${element.Text}\n\n`; // Regular text as paragraphs
          }
        }
      });
    }

    return markdown.trim();
  } catch (err) {
    console.error("Adobe PDF Services Error:", err);
    throw new Error("Failed to convert PDF");
  }
}

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { documentId } = await request.json();

    // Get user from auth header
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw new Error("Not authenticated");

    // Verify document belongs to user and get source URL
    const { data: document, error: docError } = await supabase
      .from("user_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError) throw new Error("Document not found");
    if (!document.source_url) throw new Error("Source PDF not found");

    try {
      // Update status to processing
      await supabase
        .from("user_documents")
        .update({
          processing_status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      // Convert PDF to text using Adobe PDF Services
      const convertedContent = await convertPDFToText(document.source_url);

      // Update document with converted content
      await supabase
        .from("user_documents")
        .update({
          content: convertedContent,
          processing_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      return NextResponse.json({ status: "completed" });
    } catch (conversionError) {
      console.error("Conversion error:", conversionError);

      // Update document status to failed
      await supabase
        .from("user_documents")
        .update({
          processing_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      throw conversionError;
    }
  } catch (error) {
    console.error("Process PDF error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process PDF" },
      { status: 500 }
    );
  }
}
