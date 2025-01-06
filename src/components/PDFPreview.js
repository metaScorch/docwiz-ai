"use client";

import { useEffect, useState, useRef } from "react";
import { marked } from "marked";
import { Button } from "@/components/ui/button";
import {
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import html2pdf from "html2pdf.js";

export default function PDFPreview({ content, placeholderValues, signers }) {
  const [processedContent, setProcessedContent] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const previewRef = useRef(null);

  useEffect(() => {
    if (!content || !placeholderValues) return;

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

    console.log("placeholderValues:", placeholderValues); // Debug log
    console.log("placeholderMap:", placeholderMap); // Debug log

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

    setProcessedContent(marked(processedText));
  }, [content, placeholderValues]);

  // Calculate total pages based on content height
  useEffect(() => {
    if (previewRef.current) {
      const contentHeight = previewRef.current.scrollHeight;
      const pageHeight = previewRef.current.clientHeight;
      setTotalPages(Math.ceil(contentHeight / pageHeight));
    }
  }, [processedContent]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      if (previewRef.current) {
        const pageHeight = previewRef.current.clientHeight;
        previewRef.current.scrollTop = (newPage - 1) * pageHeight;
      }
    }
  };

  const handleScroll = (direction) => {
    if (previewRef.current) {
      const scrollAmount = direction === "up" ? -100 : 100;
      previewRef.current.scrollBy({ top: scrollAmount, behavior: "smooth" });
    }
  };

  const handlePrint = () => {
    const element = document.querySelector(".preview-content");
    if (!element) return;

    // Clone the element to manipulate it without affecting the display
    const clonedElement = element.cloneNode(true);
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.left = "-9999px";
    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentDocument;
    printDocument.write(`
      <html>
        <head>
          <title>Print Document</title>
          <style>
            @page {
              margin: 20mm; /* Match the PDF margin setting */
            }
            body { 
              margin: 0;
              font-family: "Times New Roman", serif;
            }
            .preview-content {
              font-family: "Times New Roman", serif;
              line-height: 1.8;
              color: #1a1a1a;
              padding: 0 40px;
            }
            /* Copy any other styles from your PDF that make it look good */
          </style>
        </head>
        <body>
          <div class="preview-content">
            ${clonedElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    printDocument.close();

    printFrame.onload = () => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
      } catch (error) {
        console.error("Print failed:", error);
      } finally {
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 500);
      }
    };
  };

  const handleDownload = async () => {
    const element = document.querySelector(".preview-content");
    if (!element) return;

    setIsGeneratingPDF(true);
    try {
      // Clone the element to manipulate it without affecting the display
      const clonedElement = element.cloneNode(true);

      // Create a temporary container
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.width = "210mm"; // A4 width
      tempDiv.style.minHeight = "297mm"; // A4 height
      tempDiv.style.visibility = "hidden";
      document.body.appendChild(tempDiv);

      // Add the same HTML structure and styling as print, including signature styles
      tempDiv.innerHTML = `
        <div style="
          margin: 0;
          font-family: 'Times New Roman', serif;
          width: 100%;
        ">
          <div class="preview-content" style="
            font-family: 'Times New Roman', serif;
            line-height: 1.8;
            color: #1a1a1a;
            padding: 0 40px;
            width: 100%;
            position: relative;
          ">
            ${clonedElement.innerHTML}
          </div>
        </div>
      `;

      // Add signature page styles
      const styleElement = document.createElement("style");
      styleElement.textContent = `
        .signature-page {
          padding-top: 40px;
          border-top: 1px solid #eee;
          page-break-before: always;
        }
        .signature-block {
          margin-bottom: 2em;
        }
        .signature-block .border-b {
          border-bottom: 1px solid black;
          display: block;
          width: 240px;
          height: 32px;
          margin-bottom: 8px;
        }
      `;
      tempDiv.appendChild(styleElement);

      // Force layout calculation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const contentHeight = tempDiv.scrollHeight;
      const a4Height = 297; // height in mm
      const a4HeightPx = a4Height * 3.78; // rough px to mm conversion
      const totalPages = Math.ceil(contentHeight / a4HeightPx);

      const opt = {
        margin: 20,
        filename: "document.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          scrollY: 0,
          height: contentHeight,
          windowHeight: contentHeight,
          useCORS: true,
          logging: true,
          onclone: (element) => {
            // Ensure all content is visible in the cloned element
            const content = element.querySelector(".preview-content");
            if (content) {
              content.style.height = "auto";
              content.style.overflow = "visible";
              content.style.position = "relative";
            }

            // Ensure signature page styling is preserved
            const signaturePage = element.querySelector(".signature-page");
            if (signaturePage) {
              signaturePage.style.pageBreakBefore = "always";
              signaturePage.style.paddingTop = "40px";
              signaturePage.style.borderTop = "1px solid #eee";
            }
          },
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
          putTotalPages: true,
        },
      };

      try {
        await html2pdf()
          .set(opt)
          .from(tempDiv.firstElementChild)
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
          .save();
      } finally {
        document.body.removeChild(tempDiv);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="pdf-preview h-full overflow-hidden bg-gray-100 p-4 flex flex-col">
      {/* Controls at the top */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center w-full print:hidden">
        {/* Left side: Page controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        {/* Right side: Download and Print buttons */}
        <div className="flex gap-2">
          {/* Temporarily hidden download button
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
          </Button>
          */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer size={16} />
            Print
          </Button>
        </div>
      </div>

      {/* Document container with scroll controls */}
      <div className="relative flex-1 max-w-4xl mx-auto w-full">
        {/* Scroll controls - Updated positioning and z-index */}
        <div className="absolute right-[-40px] top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-10 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleScroll("up")}
            className="p-1 bg-white hover:bg-gray-100"
          >
            <ChevronsUp size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleScroll("down")}
            className="p-1 bg-white hover:bg-gray-100"
          >
            <ChevronsDown size={16} />
          </Button>
        </div>

        {/* Content */}
        <div
          ref={previewRef}
          className="preview-content bg-white p-8 shadow-lg h-full overflow-auto relative"
        >
          <div dangerouslySetInnerHTML={{ __html: processedContent }} />

          {/* Dynamic Signature Page */}
          <div className="signature-page mt-8 page-break-before">
            <h2 className="text-center mb-6">Signatures</h2>
            <div className="flex flex-col gap-8">
              {signers &&
                signers.map((signer, index) => (
                  <div key={index} className="signature-block">
                    <div className="border-b border-black w-64 h-8 mb-2"></div>
                    <p className="text-sm font-semibold">{signer.value}</p>
                    <p className="text-sm text-gray-600 mb-1">
                      {signer.description || "Signer"}
                    </p>
                    <p className="text-sm mt-1">Date: _____________________</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .preview-content {
          font-family: "Times New Roman", serif;
          line-height: 1.8;
          color: #1a1a1a;
          padding: 40px;
          scroll-behavior: smooth;
          position: relative;
          height: calc(100vh - 150px);
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

        /* Hide scrollbar but keep functionality */
        .preview-content::-webkit-scrollbar {
          width: 0px;
        }

        @media print {
          .preview-content {
            height: auto;
            overflow: visible;
          }
        }

        .signature-page {
          padding-top: 40px;
          border-top: 1px solid #eee;
        }

        .page-break-before {
          page-break-before: always;
        }

        @media print {
          .signature-page {
            break-before: page;
          }
        }
      `}</style>
    </div>
  );
}
