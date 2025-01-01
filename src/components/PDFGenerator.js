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

    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      smartLists: true,
      gfm: false,
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

      /* Explicitly prevent any hr styling */
      .preview-content hr {
        display: none;
      }
    `;

    // Add debug logging
    console.log("Initial container height:", tempContainer.offsetHeight);
    console.log("Initial scroll height:", tempContainer.scrollHeight);

    // Create temporary container for PDF generation
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "0";
    tempDiv.style.width = "210mm"; // A4 width
    tempDiv.style.minHeight = "297mm"; // A4 height
    tempDiv.style.padding = "0 0 150mm 0"; // Significantly increased bottom padding
    tempDiv.style.overflow = "visible";
    tempDiv.appendChild(styleElement);
    tempDiv.appendChild(tempContainer);
    document.body.appendChild(tempDiv);

    // Give browser more time to calculate proper dimensions
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Increased timeout

    // Get the actual height after the browser has rendered
    const actualHeight =
      Math.max(
        tempContainer.offsetHeight,
        tempContainer.scrollHeight,
        tempContainer.clientHeight,
        297 * 3.779527559 // Convert mm to px (1mm = 3.779527559px)
      ) + 300; // Significantly increased buffer

    console.log("Container heights:", {
      offsetHeight: tempContainer.offsetHeight,
      scrollHeight: tempContainer.scrollHeight,
      clientHeight: tempContainer.clientHeight,
      calculatedHeight: actualHeight,
    });

    // Configure PDF options
    const options = {
      margin: [20, 20, 80, 20], // Significantly increased bottom margin
      filename: "document.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        scrollY: 0,
        useCORS: true,
        logging: true,
        windowWidth: tempContainer.offsetWidth,
        windowHeight: actualHeight,
        height: actualHeight,
        removeContainer: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          const clonedContent = clonedDoc.querySelector(".preview-content");
          console.log("Cloned content height:", clonedContent.offsetHeight);
          // Ensure clone has sufficient height
          clonedContent.style.minHeight = `${actualHeight}px`;
          // Remove any horizontal rules that might have been added
          clonedContent.querySelectorAll("hr").forEach((hr) => hr.remove());
        },
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
