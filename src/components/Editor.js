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
  const handleSuggestionSubmit = async (prompt) => {
    if (!selection) return;

    setIsProcessing(true);
    try {
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

      setPreviewChanges({
        originalText: selection.text,
        newText: data.improvedText,
        from: selection.from,
        to: selection.to,
      });

      setPopupPosition(null);
    } catch (error) {
      console.error("Error improving text:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptChanges = () => {
    if (!previewChanges) return;

    editor
      .chain()
      .focus()
      .setTextSelection({ from: previewChanges.from, to: previewChanges.to })
      .deleteSelection()
      .insertContent(previewChanges.newText)
      .run();

    setPreviewChanges(null);
    setSelection(null);
  };

  const handleRejectChanges = () => {
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
      if (processedContent !== editor.getHTML()) {
        editor.commands.setContent(processedContent, false);
      }
    }
  }, [documentValues, content, editor, replaceContentPlaceholders]);

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
