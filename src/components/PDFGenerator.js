"use client";

import { marked } from "marked";
import html2pdf from "html2pdf.js";

export const generatePDF = async (content, placeholderValues) => {
  try {
    let processedText = content;

    // Convert placeholderValues array to an object for easier lookup
    const placeholderMap = placeholderValues.reduce((acc, item) => {
      acc[item.name] = item;
      return acc;
    }, {});

    // First pass: replace placeholders with their values
    const regex = /\{\{([^}]+)\}\}/g;
    processedText = processedText.replace(regex, (match, placeholderName) => {
      const placeholder = placeholderMap[placeholderName];
      if (placeholder && placeholder.value) {
        return placeholder.value;
      }
      // If no value or placeholder not found, keep the original placeholder
      return match;
    });

    // Special handling for signature placeholders with improved formatting
    processedText = processedText.replace(
      /\{\{(COMPANY|INVESTOR)_NAME\}\}\n\nBy: \{\{(COMPANY|INVESTOR)_SIGNER_NAME\}\}/g,
      (match, type, signerType) => {
        const name = placeholderMap[`${type}_NAME`]?.value;
        const signerName = placeholderMap[`${type}_SIGNER_NAME`]?.value;
        return `${name}\n\nBy: ${signerName}\n\n_____________________________`;
      }
    );

    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      smartLists: true,
    });

    // Convert markdown to HTML
    const processedContent = marked(processedText);

    // Create temporary container with the processed content
    const tempContainer = document.createElement("div");
    tempContainer.className = "preview-content";
    tempContainer.innerHTML = processedContent;

    // Create style element
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .preview-content {
        font-family: "Times New Roman", serif;
        line-height: 1.8;
        color: #1a1a1a;
        padding: 40px;
        position: relative;
        height: auto;
        overflow: visible;
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

      .preview-content p:has(+ p:last-child),
      .preview-content p:last-child {
        position: relative;
        margin-top: 60px;
        text-align: left;
        padding-top: 40px;
      }

      .preview-content p:has(+ p:last-child)::before,
      .preview-content p:last-child::before {
        content: "";
        position: absolute;
        top: 30px;
        left: 0;
        width: 250px;
        border-top: 1px solid #000;
      }

      .preview-content p:has(+ p:last-child) strong,
      .preview-content p:last-child strong {
        display: block;
        margin-top: 4px;
        font-weight: bold;
      }

      .preview-content p:has(+ p:last-child) em,
      .preview-content p:last-child em {
        display: block;
        margin-top: 4px;
        font-style: normal;
        color: #666;
        font-size: 0.9em;
      }

      .preview-content p:has(+ p:last-child) {
        margin-bottom: 60px;
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

    // Configure PDF options
    const options = {
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
        .set(options)
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
