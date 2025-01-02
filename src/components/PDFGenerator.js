"use client";

import { marked } from "marked";
import html2pdf from "html2pdf.js";

export const generatePDF = async (content, placeholderValues) => {
  try {
    let processedText = content;

    // Ensure placeholderValues is an array and create the map
    const placeholderMap = Array.isArray(placeholderValues)
      ? placeholderValues.reduce((acc, item) => {
          if (item && item.name) {
            acc[item.name] = item;
          }
          return acc;
        }, {})
      : {};

    // Replace placeholders with their values
    const regex = /\{\{([^}]+)\}\}/g;
    processedText = processedText.replace(regex, (match, placeholderName) => {
      const placeholder = placeholderMap[placeholderName];
      if (placeholder && placeholder.value) {
        return placeholder.value;
      }
      return match;
    });

    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      smartLists: true,
    });

    // Convert markdown to HTML
    const processedContent = marked(processedText);

    // Create temporary container with content
    const tempContainer = document.createElement("div");
    tempContainer.className = "preview-content";
    tempContainer.innerHTML = processedContent;

    // Add styling
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .preview-content {
        font-family: "Times New Roman", serif;
        line-height: 1.8;
        color: #1a1a1a;
        padding: 40px;
        scroll-behavior: smooth;
        position: relative;
        height: auto;
        max-height: none;
        overflow: visible;
        margin-right: 40px;
      }

      .preview-content h1 {
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 32px;
        text-transform: uppercase;
      }

      .preview-content h2 {
        font-size: 18px;
        font-weight: bold;
        margin-top: 24px;
        margin-bottom: 16px;
      }

      .preview-content p {
        margin-bottom: 16px;
        text-align: justify;
        font-size: 12pt;
      }

      @media print {
        .preview-content {
          height: auto;
          overflow: visible;
        }
      }
    `;

    // Create temporary container for PDF generation
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "0";
    tempDiv.appendChild(styleElement);
    tempDiv.appendChild(tempContainer);
    document.body.appendChild(tempDiv);

    // Reset scroll and height properties for proper PDF generation
    tempContainer.style.height = "auto";
    tempContainer.style.maxHeight = "none";
    tempContainer.style.overflow = "visible";
    tempContainer.style.position = "relative";

    const opt = {
      margin: [20, 20],
      filename: "document.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        scrollY: 0,
        windowHeight: tempContainer.scrollHeight,
        height: tempContainer.scrollHeight,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    };

    try {
      // Generate PDF blob
      const pdfBlob = await html2pdf()
        .set(opt)
        .from(tempContainer)
        .outputPdf("blob");

      if (!pdfBlob) {
        throw new Error("PDF generation failed - no blob created");
      }

      return pdfBlob;
    } finally {
      // Clean up
      document.body.removeChild(tempDiv);
    }
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  }
};
