"use client";

import { useEffect, useState } from "react";
import { marked } from "marked";

export default function PDFPreview({ content, placeholderValues }) {
  const [processedContent, setProcessedContent] = useState("");

  useEffect(() => {
    if (!content || !placeholderValues) return;

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
      /\{\{(EMPLOYER|EMPLOYEE)_SIGNATURE\}\}/g,
      (match, type) => {
        const name =
          type === "EMPLOYER"
            ? `For ${placeholderMap["EMPLOYER_NAME"]?.value}`
            : placeholderMap["EMPLOYEE_NAME"]?.value;
        const role = type === "EMPLOYER" ? "Authorized Signatory" : "Employee";
        return `\n\n\n_____________________________\n${name}\n${role}\n\n`;
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

  return (
    <div className="pdf-preview h-full overflow-auto bg-gray-100 p-4">
      <div
        className="preview-content bg-white p-8 max-w-4xl mx-auto shadow-lg"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
      <style jsx global>{`
        .preview-content {
          font-family: "Times New Roman", serif;
          line-height: 1.8;
          color: #1a1a1a;
          padding: 40px;
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
      `}</style>
    </div>
  );
}
