// src/components/PDFGenerator.js
import { marked } from "marked";
import html2pdf from "html2pdf.js";

export const generatePDF = async (content, placeholderValues) => {
  try {
    // Process content and placeholders
    let processedText = content;
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
      return placeholder && placeholder.value ? placeholder.value : match;
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

    // Create temporary container with proper styling
    const tempContainer = document.createElement("div");
    tempContainer.className = "legal-document";
    tempContainer.innerHTML = processedContent;

    // Add necessary styles
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .legal-document {
        font-family: "Times New Roman", Times, serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #000000;
        padding: 96pt 72pt;
        margin: 0 auto;
        max-width: 8.5in;
        box-sizing: border-box;
        counter-reset: section;
        word-break: normal;
        word-wrap: break-word;
        hyphens: none;
      }
      
      /* Main title styling */
      .legal-document h1:first-child {
        font-size: 14pt;
        font-weight: bold;
        text-align: center;
        margin: 0 0 36pt 0;
        padding: 0;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
      }
      
      /* Section headings */
      .legal-document h2 {
        font-size: 12pt;
        font-weight: bold;
        margin: 24pt 0 12pt 0;
        padding: 0;
        page-break-after: avoid;
      }
      
      /* Section numbering */
      .legal-document h2::before {
        counter-increment: section;
        content: counter(section) ". ";
      }
      
      /* Paragraph spacing and formatting */
      .legal-document p {
        margin: 0 0 12pt 0;
        padding: 0;
        text-align: justify;
        orphans: 3;
        widows: 3;
        word-break: normal;
        overflow-wrap: break-word;
        hyphens: none;
      }
      
      /* List styling */
      .legal-document ul, 
      .legal-document ol {
        margin: 0 0 12pt 0;
        padding-left: 24pt;
      }
      
      .legal-document li {
        margin: 0 0 6pt 0;
        padding: 0;
      }
      
      /* Subsection styling */
      .legal-document .subsection {
        margin: 0 0 16pt 0;
        padding: 0;
      }

      /* Signature block styling */
      .legal-document .signature-block {
        margin-top: 36pt;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Page layout */
      @page {
        size: letter;
        margin: 1in;
      }
      
      /* Section break control */
      .legal-document section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Table styling */
      .legal-document table {
        width: 100%;
        margin: 12pt 0;
        border-collapse: collapse;
        page-break-inside: avoid;
      }
      
      .legal-document th, 
      .legal-document td {
        padding: 6pt;
        border: 1pt solid #000000;
        text-align: left;
      }

      /* Remove blank pages */
      .legal-document:last-child:blank {
        display: none;
      }

      /* Witness section spacing */
      .legal-document .witness-section {
        margin-top: 48pt;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    `;

    // Create container for PDF generation
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "0";
    tempDiv.appendChild(styleElement);
    tempDiv.appendChild(tempContainer);
    document.body.appendChild(tempDiv);

    // Configure PDF options
    const opt = {
      margin: 0,
      filename: "document.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollY: 0,
        windowWidth: tempContainer.scrollWidth,
        windowHeight: tempContainer.scrollHeight,
        removeContainer: true,
        onclone: function (clonedDoc) {
          const content = clonedDoc.querySelector(".legal-document");
          if (content) {
            // Process all text nodes to prevent word breaks
            const walk = document.createTreeWalker(
              content,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            let node;
            while ((node = walk.nextNode())) {
              if (node.parentElement.tagName !== "PRE") {
                // Replace hyphenation opportunities with non-breaking spaces
                node.textContent = node.textContent.replace(
                  /\u00AD/g,
                  "\u00A0"
                );
              }
            }

            // Add proper spacing
            content.style.marginTop = "48pt";
            content.style.marginBottom = "48pt";

            // Remove empty pages
            const pages = content.querySelectorAll(".page");
            pages.forEach((page) => {
              if (!page.textContent.trim()) {
                page.remove();
              }
            });
          }
        },
      },
      jsPDF: {
        unit: "pt",
        format: "letter",
        orientation: "portrait",
        compress: true,
        precision: 16,
        hotfixes: ["px_scaling"],
      },
      pagebreak: {
        mode: ["avoid-all", "css", "legacy"],
        before: ".page-break-before",
        after: ".page-break-after",
        avoid: ["h2", "h3", ".signature-block", ".witness-section"],
      },
    };

    try {
      // Generate PDF
      const pdfBlob = await html2pdf()
        .from(tempContainer)
        .set(opt)
        .outputPdf("blob");

      // Clean up
      document.body.removeChild(tempDiv);

      return pdfBlob;
    } catch (error) {
      console.error("PDF Generation Error:", error);
      document.body.removeChild(tempDiv);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  } catch (error) {
    console.error("PDF Processing Error:", error);
    throw new Error(`Failed to process PDF content: ${error.message}`);
  }
};

// Helper function to generate PDF for preview
export const generatePreviewPDF = async (content, placeholderValues) => {
  return generatePDF(content, placeholderValues);
};

// Helper function to generate PDF for SignWell
export const generateSignwellPDF = async (content, placeholderValues) => {
  return generatePDF(content, placeholderValues);
};
