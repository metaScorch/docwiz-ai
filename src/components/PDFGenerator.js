// src/components/PDFGenerator.js
import { marked } from "marked";
import html2pdf from "html2pdf.js";

export const generatePDF = async (
  content,
  placeholderValues,
  displayHeader = false,
  headerContent = ""
) => {
  try {
    // Debug log
    console.log("PDF Generation Values:", {
      hasContent: !!content,
      contentPreview: content?.substring(0, 100) + "...",
      placeholderCount: placeholderValues?.length,
      displayHeader,
      headerContentPreview: headerContent?.substring(0, 100) + "...",
    });

    // Process content and placeholders
    let processedText = content;

    // Add header if displayHeader is true and headerContent exists
    if (displayHeader && headerContent) {
      processedText = `${headerContent}\n---\n${processedText}`;
    }

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
        padding: 96pt 36pt;
        margin: 0 auto;
        max-width: 8.5in;
        box-sizing: border-box;
        word-break: normal;
        word-wrap: break-word;
        hyphens: none;
      }
      
      /* Main title styling - make it more specific to override header styles */
      .legal-document h1,
      .legal-document h1:first-child {
        font-size: 14pt;
        font-weight: bold;
        text-align: center !important;  /* Force center alignment */
        margin: 36pt 0 36pt 0;
        padding: 0;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
        color: #000000;
        line-height: 1.2;
      }
      
      /* Section headings */
      .legal-document h2 {
        font-size: 12pt;
        font-weight: bold;
        margin: 24pt 0 6pt 0;
        padding: 0;
        break-inside: avoid;
        page-break-inside: avoid;
        break-after: avoid;
        page-break-after: avoid;
      }
      
      .legal-document h2 + p,
      .legal-document h2 + div {
        break-before: avoid;
        break-after: avoid;
        page-break-before: avoid;
        page-break-after: avoid;
      }

      /* Paragraph spacing and formatting */
      .legal-document p {
        margin: 0 0 6pt 0;
        padding: 0;
        orphans: 3;
        widows: 3;
        break-inside: avoid;
        page-break-inside: avoid;
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

      /* Header specific styles - ensure they don't affect the main title */
      .legal-document .header h2,
      .legal-document .header p {
        text-align: left;
        margin: 0 0 0.5rem 0;
        font-size: 10.5pt;
        line-height: 1.1;
      }
      
      /* Separator after header */
      .legal-document hr {
        margin: 1.5rem 0 2.5rem 0;
        border: none;
        height: 1px;
        background: #000000;
        opacity: 0.15;
      }

      /* Improve section break control */
      .legal-document h2,
      .legal-document h3 {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      .legal-document p {
        orphans: 3;
        widows: 3;
      }
      
      /* Keep sections together when possible */
      .legal-document section {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      /* Section controls */
      .legal-document section,
      .legal-document div {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      /* Header specific styles */
      .legal-document .header {
        text-align: left;
        margin-bottom: 24pt;
      }

      /* Logo specific controls */
      .legal-document .header img,
      .legal-document .header img[src*="logo"],
      .legal-document > .header > img,
      img[alt*="logo"],
      img[src*="DocWiz"] {
        width: 30px !important;
        max-width: 30px !important;
        height: auto !important;
        max-height: 10px !important;
        object-fit: contain !important;
        display: block !important;
        margin: 0 0 24pt 0 !important;
        transform: scale(1) !important;
      }

      .legal-document .header h2,
      .legal-document .header p {
        margin: 0;
        font-size: 10.5pt;
        line-height: 1.1;
        color: #000000;
      }

      .legal-document .header h2 {
        font-weight: bold;
        font-size: 12pt;
        margin-bottom: 6pt;
      }

      .legal-document .header p {
        margin-bottom: 4pt;
      }

      /* Separator after header */
      .legal-document hr {
        margin: 1.5rem 0 2.5rem 0;
        border: none;
        height: 1px;
        background: #000000;
        opacity: 0.15;
      }

      /* Main title styling */
      .legal-document h1,
      .legal-document h1:first-child {
        font-size: 14pt;
        font-weight: bold;
        text-align: center !important;
        margin: 36pt 0 36pt 0;
        padding: 0;
        text-transform: uppercase;
        letter-spacing: 0.5pt;
        color: #000000;
        line-height: 1.2;
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
      margin: [36, 48, 36, 48],
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
            // Process header if present
            const headerSeparator = content.querySelector("hr");
            if (headerSeparator) {
              headerSeparator.style.margin = "1.5rem 0 2.5rem 0";
            }

            // Process header paragraphs
            const headerParagraphs = content.querySelectorAll("h2 ~ p");
            headerParagraphs.forEach((p) => {
              p.style.margin = "0";
              p.style.lineHeight = "1.1";
            });

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

            // Force logo size in the cloned document
            const logo = content.querySelector(".header img");
            if (logo) {
              logo.style.cssText = `
                width: 120px !important;
                height: 40px !important;
                max-width: 120px !important;
                max-height: 40px !important;
                object-fit: contain !important;
                display: block !important;
                margin: 0 0 24pt 0 !important;
              `;
            }
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
        before: [".page-break-before"],
        after: [".page-break-after"],
        avoid: [
          "h1",
          "h2",
          "h3",
          "p",
          ".signature-block",
          ".witness-section",
          "section",
          ".legal-document > *",
        ],
      },
    };

    try {
      // Generate PDF
      const pdfBlob = await html2pdf()
        .set(opt)
        .from(tempContainer)
        .toPdf()
        .get("pdf")
        .then((pdf) => {
          pdf.setProperties({
            title: "Document",
            subject: "Document",
            creator: "Your App",
            author: "Your App",
            keywords: "document, pdf",
            producer: "html2pdf.js",
          });
          return pdf;
        })
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
export const generatePreviewPDF = async (
  content,
  placeholderValues,
  displayHeader = false,
  headerContent = ""
) => {
  return generatePDF(content, placeholderValues, displayHeader, headerContent);
};

// Helper function to generate PDF for SignWell
export const generateSignwellPDF = async (
  content,
  placeholderValues,
  displayHeader = false,
  headerContent = ""
) => {
  return generatePDF(content, placeholderValues, displayHeader, headerContent);
};
