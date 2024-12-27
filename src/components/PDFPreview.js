"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Document, Page } from "react-pdf";
import { marked } from "marked";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export default function PDFPreview({ content, placeholderValues }) {
  const [processedContent, setProcessedContent] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);

  // Replace placeholders with their values
  useEffect(() => {
    if (!content || !placeholderValues) return;

    let processedText = content;
    Object.entries(placeholderValues).forEach(([key, details]) => {
      const placeholder = `{{${key}}}`;
      const value = details.value || placeholder; // Keep placeholder if no value
      processedText = processedText.replace(
        new RegExp(placeholder, "g"),
        value
      );
    });

    // Convert Markdown to HTML
    const htmlContent = marked(processedText);
    setProcessedContent(htmlContent);

    // Generate PDF
    const generatePDF = async () => {
      try {
        // Create PDF document
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
        console.error("Error generating PDF:", error);
      }
    };

    generatePDF();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [content, placeholderValues]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  if (!pdfUrl) {
    return <div>Loading PDF...</div>;
  }

  return (
    <div className="pdf-preview h-full overflow-auto">
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col items-center"
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
