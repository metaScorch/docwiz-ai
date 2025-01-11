// src/app/api/process-pdf/route.js
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
const PDFServicesSdk = require("@adobe/pdfservices-node-sdk");

// Initialize Adobe credentials - Move this inside the POST handler
async function initializeAdobeSDK() {
  try {
    const credentials =
      PDFServicesSdk.Credentials.serviceAccountCredentialsBuilder()
        .withClientId(process.env.ADOBE_CLIENT_ID)
        .withClientSecret(process.env.ADOBE_CLIENT_SECRET)
        .build();

    return PDFServicesSdk.ExecutionContext.create(credentials);
  } catch (error) {
    console.error("Error initializing Adobe SDK:", error);
    throw new Error("Failed to initialize Adobe SDK");
  }
}

async function convertPDFToText(pdfUrl, executionContext) {
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
          if (element.TextSize >= 16) {
            markdown += `# ${element.Text}\n\n`;
          } else if (element.TextSize >= 14) {
            markdown += `## ${element.Text}\n\n`;
          } else {
            markdown += `${element.Text}\n\n`;
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

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Get user from auth header
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify document belongs to user and get source URL
    const { data: document, error: docError } = await supabase
      .from("user_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      console.error("Document error:", docError);
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (!document.source_url) {
      return NextResponse.json(
        { error: "Source PDF not found" },
        { status: 404 }
      );
    }

    try {
      // Initialize Adobe SDK
      const executionContext = await initializeAdobeSDK();

      // Update status to processing
      await supabase
        .from("user_documents")
        .update({
          processing_status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      // Convert PDF to text using Adobe PDF Services
      const convertedContent = await convertPDFToText(
        document.source_url,
        executionContext
      );

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
