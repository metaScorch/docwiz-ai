// src/lib/pdfServices.js
import PDFServicesSdk from "@adobe/pdfservices-node-sdk";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const credentials =
  PDFServicesSdk.Credentials.serviceAccountCredentialsBuilder()
    .withClientId(process.env.ADOBE_CLIENT_ID)
    .withClientSecret(process.env.ADOBE_CLIENT_SECRET)
    .build();

const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

export async function convertPDFToDoc(pdfUrl) {
  try {
    // Download the PDF file
    const response = await fetch(pdfUrl);
    const pdfBuffer = await response.arrayBuffer();

    // Create a temporary file from the buffer
    const inputPdf = PDFServicesSdk.FileRef.createFromStream(
      Buffer.from(pdfBuffer),
      PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
    );

    // Create the extract PDF operation
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();

    // Set the output format
    extractPDFOperation.setOptions(
      new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
        .addElementsToExtract(
          PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT
        )
        .build()
    );

    // Execute the operation
    const result = await extractPDFOperation.execute(executionContext);

    // Parse the result
    const extracted = JSON.parse(await result.toString());

    // Convert the extracted content to markdown
    let markdown = "";
    extracted.elements.forEach((element) => {
      if (element.Text) {
        markdown += element.Text + "\n";
      }
    });

    return markdown;
  } catch (err) {
    console.error("Error converting PDF:", err);
    throw new Error("Failed to convert PDF document");
  }
}

export async function processPDFDocument(documentId) {
  const supabase = createClientComponentClient();

  try {
    // Get the document
    const { data: document, error } = await supabase
      .from("user_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error) throw error;

    // Convert PDF to markdown
    const markdown = await convertPDFToDoc(document.source_url);

    // Update the document with the converted content
    const { error: updateError } = await supabase
      .from("user_documents")
      .update({
        content: markdown,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) throw updateError;

    return markdown;
  } catch (err) {
    console.error("Error processing PDF document:", err);
    throw new Error("Failed to process PDF document");
  }
}
