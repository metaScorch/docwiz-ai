// src/app/api/test-adobe/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Import the entire module and access it correctly
    const { PDFServicesSdk } = await import("@adobe/pdfservices-node-sdk");

    // Initialize credentials
    const credentials =
      PDFServicesSdk.Credentials.serviceAccountCredentialsBuilder()
        .withClientId(process.env.ADOBE_CLIENT_ID)
        .withClientSecret(process.env.ADOBE_CLIENT_SECRET)
        .build();

    // Create execution context
    const executionContext =
      PDFServicesSdk.ExecutionContext.create(credentials);

    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create PDF Services input from buffer
    const input = PDFServicesSdk.FileRef.createFromBuffer(
      buffer,
      PDFServicesSdk.ExtractPDF.SupportedSourceFormat.pdf
    );

    // Create the extract PDF operation
    const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();

    // Configure the operation to extract everything
    const options =
      new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
        .addElements(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT)
        .addElements(
          PDFServicesSdk.ExtractPDF.options.ExtractElementType.TABLES
        )
        .addElementsToExtract(
          PDFServicesSdk.ExtractPDF.options.ExtractElementType.TABLES
        )
        .addElementsToExtract(
          PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT
        )
        .build();

    extractPDFOperation.setOptions(options);

    console.log("Executing extraction operation...");

    // Execute the operation
    const result = await extractPDFOperation.execute(executionContext);

    console.log("Extraction complete, parsing results...");

    // Parse the results
    const extractedContent = JSON.parse(await result.toString());

    // Return both the structured data and a simplified text version
    return NextResponse.json({
      success: true,
      rawExtraction: extractedContent,
      textContent: extractedContent.elements
        ?.filter((element) => element.Text)
        .map((element) => ({
          text: element.Text,
          fontSize: element.TextSize,
          font: element.Font,
          color: element.TextColor,
        })),
    });
  } catch (error) {
    console.error("Adobe PDF Services Error:", error);

    // Return detailed error information for debugging
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          type: error.constructor.name,
          details: error.toString(),
        },
      },
      {
        status: 500,
      }
    );
  }
}

// Increase payload size limit for PDF files
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
