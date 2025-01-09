"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import { common, createLowlight } from "lowlight";
import { useEffect, useState, useCallback } from "react";
import { Markdown } from "tiptap-markdown";
import MenuBar from "./MenuBar";
import Sidebar from "./Sidebar";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import "../styles/editor.css";
import SuggestionPopup from "./SuggestionPopup";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import ChangePreview from "./ChangePreview";
import { Wand2 } from "lucide-react";
import { posthog } from "@/lib/posthog";

// Create a new lowlight instance with common languages
const lowlight = createLowlight(common);

// Custom extension for placeholder highlighting and value display
const PlaceholderHighlight = Extension.create({
  name: "placeholderHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("placeholderHighlight"),
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations = [];

            doc.descendants((node, pos) => {
              if (node.isText) {
                const regex = /\{\{([^}]+)\}\}/g;
                let match;

                while ((match = regex.exec(node.text)) !== null) {
                  const start = pos + match.index;
                  const end = start + match[0].length;

                  decorations.push(
                    Decoration.inline(start, end, {
                      class: "placeholder-text",
                    })
                  );
                }
              }
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});

export default function Editor({
  content,
  onChange,
  documentId,
  onImproveFormatting,
  featureCounts,
  onUpdateFeatureCount,
  setCurrentFeature,
  setShowUpgradeModal,
  hasActiveSubscription,
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [documentValues, setDocumentValues] = useState({});
  const [selection, setSelection] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewChanges, setPreviewChanges] = useState(null);
  const supabase = createClientComponentClient();

  // Function to extract placeholders from content
  const extractPlaceholders = useCallback((text) => {
    console.log("Extracting placeholders from:", text);
    const regex = /\{\{([^}]+)\}\}/g;
    const placeholders = {};
    let match;

    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      placeholders[name] = {
        name: name,
        value: "",
        description: `Value for ${name.toLowerCase().replace(/_/g, " ")}`,
      };
    }

    console.log("Extracted placeholders:", placeholders);
    return placeholders;
  }, []);

  // Add this function to replace placeholders with their values
  const replaceContentPlaceholders = useCallback(
    (content) => {
      if (!content || !documentValues) return content;

      let processedContent = content;
      Object.entries(documentValues).forEach(([name, details]) => {
        const placeholder = `{{${name}}}`;
        const value = details.value || placeholder;
        processedContent = processedContent.replace(
          new RegExp(placeholder, "g"),
          value
        );
      });

      return processedContent;
    },
    [documentValues]
  );

  // Editor initialization
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: "Start typing...",
      }),
      Typography,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "javascript",
      }),
      Link.configure({
        openOnClick: false,
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      PlaceholderHighlight,
    ],
    content: replaceContentPlaceholders(content),
    onUpdate: ({ editor }) => {
      // Get the markdown content
      const markdown = editor.storage.markdown.getMarkdown();

      // Replace any displayed values back to placeholders before saving
      let processedMarkdown = markdown;
      Object.entries(documentValues).forEach(([name, details]) => {
        if (details.value) {
          const value = details.value;
          const placeholder = `{{${name}}}`;
          processedMarkdown = processedMarkdown.replace(
            new RegExp(value, "g"),
            placeholder
          );
        }
      });

      if (onChange) {
        onChange(processedMarkdown);
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none" +
          " prose-headings:font-semibold" +
          " prose-h1:text-3xl prose-h1:mb-4" +
          " prose-h2:text-2xl prose-h2:mb-3" +
          " prose-h3:text-xl prose-h3:mb-2" +
          " prose-p:text-base prose-p:leading-relaxed" +
          " prose-pre:text-sm",
      },
    },
  });

  // Initialize document values from database or content
  useEffect(() => {
    if (documentId && content) {
      const fetchDocumentValues = async () => {
        console.log("Fetching document values for ID:", documentId);
        const { data: document, error } = await supabase
          .from("user_documents")
          .select("placeholder_values")
          .eq("id", documentId)
          .single();

        console.log("Database values:", document?.placeholder_values);

        // Extract placeholders from content first
        const placeholders = extractPlaceholders(content);

        // If we have values in the database, update the placeholders
        if (!error && document?.placeholder_values?.length > 0) {
          document.placeholder_values.forEach((dbPlaceholder) => {
            if (placeholders[dbPlaceholder.name]) {
              // Preserve all metadata from the database
              placeholders[dbPlaceholder.name] = {
                ...dbPlaceholder,
                value: dbPlaceholder.value || "",
              };
            }
          });
        }

        console.log("Final placeholder values:", placeholders);
        setDocumentValues(placeholders);
      };

      fetchDocumentValues();
    } else if (content) {
      // If no documentId but we have content, just extract placeholders
      const placeholders = extractPlaceholders(content);
      setDocumentValues(placeholders);
    }
  }, [documentId, content, extractPlaceholders, supabase]);

  // Selection handling
  useEffect(() => {
    if (!editor) return;

    const handleSelection = () => {
      const { view } = editor;
      const { from, to } = view.state.selection;

      if (from === to) {
        setSelection(null);
        setPopupPosition(null);
        return;
      }

      const selectedText = editor.state.doc.textBetween(from, to);
      const coords = view.coordsAtPos(from);

      setSelection({
        text: selectedText,
        from,
        to,
      });

      setPopupPosition({
        top: coords.top + window.scrollY - 10,
        left: coords.left + window.scrollX,
      });
    };

    editor.on("selectionUpdate", handleSelection);
    return () => editor.off("selectionUpdate", handleSelection);
  }, [editor]);

  // Placeholder value handling
  const handlePlaceholderChange = async (name, value) => {
    posthog.capture("placeholder_updated", {
      document_id: documentId,
      placeholder_name: name,
      has_value: !!value,
      is_signer: documentValues[name]?.signer || false,
    });

    console.log("Updating placeholder:", name, "with value:", value);

    // Update local state
    const newValues = {
      ...documentValues,
      [name]: {
        ...documentValues[name],
        value: value,
      },
    };
    setDocumentValues(newValues);

    // Update database if we have a document ID
    if (documentId) {
      // Get existing placeholder values from database
      const { data: document, error: fetchError } = await supabase
        .from("user_documents")
        .select("placeholder_values")
        .eq("id", documentId)
        .single();

      if (fetchError) {
        console.error(
          "Error fetching existing placeholder values:",
          fetchError
        );
        return;
      }

      // Create a map of existing placeholder data
      const existingPlaceholders = document.placeholder_values.reduce(
        (acc, placeholder) => {
          acc[placeholder.name] = placeholder;
          return acc;
        },
        {}
      );

      // Merge new values while preserving existing metadata
      const placeholderArray = Object.entries(newValues).map(
        ([name, details]) => ({
          ...existingPlaceholders[name], // Preserve existing metadata
          name,
          value: details.value || "", // Update only the value
        })
      );

      const { error } = await supabase
        .from("user_documents")
        .update({
          placeholder_values: placeholderArray,
        })
        .eq("id", documentId);

      if (error) {
        console.error("Error updating placeholder values:", error);
      }
    }
  };

  // AI improvement handling
  const handleSuggestionSubmit = async (prompt, shouldFormat = false) => {
    posthog.capture("ai_improvement_started", {
      document_id: documentId,
      selection_length: selection?.text?.length,
      format_requested: shouldFormat,
      has_subscription: hasActiveSubscription,
    });

    if (!selection) return;

    // Only check limits for non-subscribed users
    if (!hasActiveSubscription) {
      const AMENDMENTS_LIMIT = 3;
      if (featureCounts.amendments >= AMENDMENTS_LIMIT) {
        setCurrentFeature("amendments");
        setShowUpgradeModal(true);
        setPopupPosition(null);
        setSelection(null);
        return;
      }
    }

    setIsProcessing(true);
    try {
      // First, improve the selected text
      const response = await fetch("/api/improve-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText: selection.text,
          fullDocument: editor.getHTML(),
          prompt,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // If formatting is requested, process the entire document
      if (shouldFormat) {
        const updatedContent =
          editor.state.doc.textBetween(0, selection.from) +
          data.improvedText +
          editor.state.doc.textBetween(
            selection.to,
            editor.state.doc.content.size
          );

        const formatResponse = await fetch("/api/improve-formatting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: updatedContent }),
        });

        const formatData = await formatResponse.json();
        if (formatData.error) throw new Error(formatData.error);

        setPreviewChanges({
          originalText: selection.text,
          newText: data.improvedText,
          from: selection.from,
          to: selection.to,
          formattedDocument: formatData.formattedContent,
        });
      } else {
        setPreviewChanges({
          originalText: selection.text,
          newText: data.improvedText,
          from: selection.from,
          to: selection.to,
        });
      }

      // Always update count for analytics
      if (data.improvedText) {
        await onUpdateFeatureCount("amendments");
      }

      setPopupPosition(null);

      // Track successful improvement
      posthog.capture("ai_improvement_completed", {
        document_id: documentId,
        processing_time: Date.now() - startTime,
        success: true,
        format_requested: shouldFormat,
      });
    } catch (error) {
      posthog.capture("ai_improvement_error", {
        document_id: documentId,
        error_message: error.message,
        format_requested: shouldFormat,
      });
      console.error("Error improving text:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptChanges = () => {
    posthog.capture("ai_changes_accepted", {
      document_id: documentId,
      original_length: previewChanges?.originalText?.length,
      new_length: previewChanges?.newText?.length,
      is_formatting: !!previewChanges?.formattedDocument,
    });

    if (!previewChanges) return;

    if (previewChanges.formattedDocument) {
      // If we have a formatted version, use the entire document
      editor.commands.setContent(previewChanges.formattedDocument);
    } else {
      // Otherwise just replace the selected portion
      editor
        .chain()
        .focus()
        .setTextSelection({ from: previewChanges.from, to: previewChanges.to })
        .deleteSelection()
        .insertContent(previewChanges.newText)
        .run();
    }

    setPreviewChanges(null);
    setSelection(null);
  };

  const handleRejectChanges = () => {
    posthog.capture("ai_changes_rejected", {
      document_id: documentId,
      original_length: previewChanges?.originalText?.length,
      new_length: previewChanges?.newText?.length,
      is_formatting: !!previewChanges?.formattedDocument,
    });

    setPreviewChanges(null);
    setSelection(null);
  };

  const handleImproveFormatting = async () => {
    if (!editor) return;

    try {
      const currentContent = editor.storage.markdown.getMarkdown();
      if (onImproveFormatting) {
        const formattedContent = await onImproveFormatting(currentContent);
        if (formattedContent) {
          editor.commands.setContent(formattedContent, true);
        }
      }
    } catch (error) {
      console.error("Error improving formatting:", error);
    }
  };

  // Update editor content when documentValues change
  useEffect(() => {
    if (editor && content && documentValues) {
      const processedContent = replaceContentPlaceholders(content);
      // Only update if the content is actually different
      if (processedContent !== editor.getHTML()) {
        // Store current selection
        const { from, to } = editor.state.selection;

        editor.commands.setContent(processedContent, false);

        // Restore selection
        editor.commands.setTextSelection({ from, to });
      }
    }
  }, [documentValues, content, editor, replaceContentPlaceholders]);

  // Track editor initialization
  useEffect(() => {
    if (editor && documentId) {
      posthog.capture("editor_loaded", {
        document_id: documentId,
        content_length: content?.length || 0,
        has_placeholders: Object.keys(documentValues || {}).length > 0,
      });
    }
  }, [editor, documentId]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-[calc(100vh-200px)] p-4 border rounded-lg">
        Loading editor...
      </div>
    );
  }

  return (
    <div className="max-w-none flex relative">
      <div className="flex-1 border rounded-lg">
        <MenuBar
          editor={editor}
          onImproveFormatting={handleImproveFormatting}
        />
        <EditorContent
          editor={editor}
          className="min-h-[calc(100vh-200px)] p-4"
        />
        {popupPosition && (
          <SuggestionPopup
            position={popupPosition}
            onSubmit={handleSuggestionSubmit}
            onClose={() => {
              setSelection(null);
              setPopupPosition(null);
            }}
          />
        )}
      </div>
      <Sidebar
        documentValues={documentValues}
        onValueChange={handlePlaceholderChange}
      />
      {previewChanges && (
        <ChangePreview
          originalText={previewChanges.originalText}
          newText={previewChanges.newText}
          onAccept={handleAcceptChanges}
          onReject={handleRejectChanges}
        />
      )}
    </div>
  );
}
