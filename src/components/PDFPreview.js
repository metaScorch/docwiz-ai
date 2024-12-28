"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { marked } from "marked";

// Initialize PDF.js worker with a local path
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export default function PDFPreview({ content, placeholderValues }) {
  const [processedContent, setProcessedContent] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    if (!content || !placeholderValues) return;

    let processedText = content;
    Object.entries(placeholderValues).forEach(([key, details]) => {
      const placeholder = `{{${key}}}`;
      const value = details.value || "";
      processedText = processedText.replace(
        new RegExp(placeholder, "g"),
        value
      );
    });

    // Convert Markdown to HTML and add basic styling
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1, h2 { color: #333; }
          </style>
        </head>
        <body>
          ${marked(processedText)}
        </body>
      </html>
    `;

    // Generate PDF using html2pdf or similar library
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [content, placeholderValues]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  if (!pdfUrl) return <div>Loading PDF...</div>;

  return (
    <div className="pdf-preview h-full overflow-auto">
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col items-center"
        error="Failed to load PDF. Please try again."
      >
        {Array.from(new Array(numPages), (el, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            className="mb-4"
            scale={1.0}
          />
        ))}
      </Document>
    </div>
  );
}
