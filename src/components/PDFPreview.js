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

export default function PDFPreview({ content, placeholderValues }) {
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
      const tempContainer = document.createElement("div");
      tempContainer.appendChild(clonedElement);

      // Reset scroll and height properties for proper PDF generation
      clonedElement.style.height = "auto";
      clonedElement.style.maxHeight = "none";
      clonedElement.style.overflow = "visible";
      clonedElement.style.position = "relative";

      const opt = {
        margin: [20, 20],
        filename: "document.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          scrollY: 0,
          windowHeight: element.scrollHeight,
          height: element.scrollHeight,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
      };

      // Create temporary container for PDF generation
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "0";
      tempDiv.appendChild(clonedElement);
      document.body.appendChild(tempDiv);

      try {
        await html2pdf().set(opt).from(clonedElement).save();
      } finally {
        // Clean up
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
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
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

        /* Name styling */
        .preview-content p:has(+ p:last-child) strong,
        .preview-content p:last-child strong {
          display: block;
          margin-top: 4px;
          font-weight: bold;
        }

        /* Role/title styling */
        .preview-content p:has(+ p:last-child) em,
        .preview-content p:last-child em {
          display: block;
          margin-top: 4px;
          font-style: normal;
          color: #666;
          font-size: 0.9em;
        }

        /* Add equal spacing between signature blocks */
        .preview-content p:has(+ p:last-child) {
          margin-bottom: 60px;
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
      `}</style>
    </div>
  );
}
