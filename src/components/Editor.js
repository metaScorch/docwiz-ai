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
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import ImageExtension from "@tiptap/extension-image";

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
  documentValues,
  onUpdateDocumentValues,
  headerContent,
  displayHeader,
  onHeaderChange,
  onDisplayHeaderChange,
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [selection, setSelection] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewChanges, setPreviewChanges] = useState(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

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

  // Add this function to handle header changes with proper Markdown parsing
  const handleHeaderChange = (newHeaderContent) => {
    console.log("New raw header content:", newHeaderContent);

    // Ensure proper line breaks and Markdown formatting
    const formattedHeader = newHeaderContent
      .replace(/!\[(.*?)\]\((.*?)\)/, (match) => `\n\n${match}\n\n`) // Add breaks around images
      .replace(/(#{1,6} .+)/, (match) => `\n${match}\n\n`) // Add breaks around headings
      .replace(/(\n{3,})/g, "\n\n") // Normalize multiple line breaks
      .trim();

    console.log("Formatted header content:", formattedHeader);

    if (onHeaderChange) {
      onHeaderChange(formattedHeader);
    }
  };

  // Add function to generate default letterhead from registration
  const generateDefaultLetterhead = (registration) => {
    console.log(
      "Generating default letterhead from registration:",
      registration
    );
    if (!registration) return "";

    let letterhead = "";

    // Logo at the top, left-aligned
    if (registration.logo_url) {
      letterhead += `<div style="text-align: left">![${registration.entity_name || "Company Logo"}](${registration.logo_url})</div>\n\n`;
    }

    // Company name
    letterhead += `## ${registration.entity_name || ""}\n\n`;

    // Address
    if (registration.address_line1) {
      letterhead += `${registration.address_line1} ${registration.city_name || ""}, ${registration.state_name || ""} ${registration.postal_code || ""}\n\n`;
    }

    // Contact info
    const contactInfo = [];
    if (registration.phone_number)
      contactInfo.push(`+${registration.phone_number.replace(/\D/g, "")}`);
    if (registration.email) contactInfo.push(registration.email);

    if (contactInfo.length > 0) {
      letterhead += `${contactInfo.join(" | ")}\n\n`;
    }

    // // Single separator line with no extra newlines
    // letterhead += "---";

    console.log("Generated letterhead content:", letterhead);
    return letterhead;
  };

  // Fetch registration data and set default letterhead
  useEffect(() => {
    const fetchRegistration = async () => {
      console.log(
        "Fetching registration. Current headerContent:",
        headerContent
      );
      console.log("Display header status:", displayHeader);

      if (!documentId || headerContent) {
        console.log("Skipping registration fetch:", {
          hasDocumentId: !!documentId,
          hasHeaderContent: !!headerContent,
        });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log("No user session found");
        return;
      }

      // Fetch all registration fields we need for the letterhead
      const { data: registration, error } = await supabase
        .from("registrations")
        .select(
          `
          id,
          entity_name,
          logo_url,
          address_line1,
          address_line2,
          city_name,
          state_name,
          postal_code,
          phone_number,
          email,
          fax_number
        `
        )
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching registration:", error);
        return;
      }

      console.log("Fetched registration data:", registration);

      if (registration) {
        // Format the address from individual fields
        const formattedAddress = [
          registration.address_line1,
          registration.address_line2,
        ]
          .filter(Boolean)
          .join("\n");

        const formattedRegistration = {
          ...registration,
          // Combine address fields
          address: formattedAddress,
          city: registration.city_name,
          state: registration.state_name,
          zip: registration.postal_code,
          phone: registration.phone_number,
          // Keep other fields as is
          email: registration.email,
          entity_name: registration.entity_name,
          logo_url: registration.logo_url,
          fax: registration.fax_number,
        };

        const defaultLetterhead = generateDefaultLetterhead(
          formattedRegistration
        );
        console.log("Setting default letterhead:", defaultLetterhead);
        handleHeaderChange(defaultLetterhead);
      }
    };

    fetchRegistration();
  }, [documentId, supabase, headerContent, displayHeader]);

  // Add this function to handle content updates while preserving cursor position
  const updateEditorContent = (newContent) => {
    if (!editor) return;

    // Store current selection
    const { from, to } = editor.state.selection;

    // Get current cursor position relative to the start of the document
    const currentPos = editor.state.selection.$head.pos;

    // Check if we're in the header section
    const isInHeader =
      displayHeader &&
      currentPos <
        editor.state.doc
          .textBetween(0, editor.state.doc.content.size)
          .indexOf("---");

    // Only update if content has changed
    if (newContent !== editor.getHTML()) {
      console.log("Updating editor content while preserving cursor");
      editor.commands.setContent(newContent, false);

      // Restore cursor position
      if (isInHeader) {
        // If in header, keep cursor in same relative position
        editor.commands.setTextSelection(from);
      } else {
        // If in main content, adjust position to account for header
        const headerOffset = displayHeader
          ? editor.state.doc
              .textBetween(0, editor.state.doc.content.size)
              .indexOf("---") + 3
          : 0;
        editor.commands.setTextSelection(from + headerOffset);
      }
    }
  };

  // Editor initialization
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
          HTMLAttributes: {
            class: "letterhead-heading",
          },
        },
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
        breaks: true, // Enable line breaks
      }),
      PlaceholderHighlight,
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "letterhead-logo max-h-20 object-contain",
        },
      }),
    ],
    content: displayHeader
      ? `${headerContent}\n---\n${replaceContentPlaceholders(content)}`
      : replaceContentPlaceholders(content),
    onUpdate: ({ editor, transaction }) => {
      // Only process if it's a content change
      if (!transaction.docChanged) return;

      console.log("Editor content updated");
      const markdown = editor.storage.markdown.getMarkdown();

      if (displayHeader) {
        console.log("Splitting content for header");
        const [header, ...rest] = markdown.split("\n---\n");

        // Store current cursor position
        const currentPos = editor.state.selection.$head.pos;
        const isInHeader =
          currentPos <
          editor.state.doc
            .textBetween(0, editor.state.doc.content.size)
            .indexOf("---");

        if (isInHeader) {
          handleHeaderChange(header);
        }

        if (onChange) {
          onChange(rest.join("\n---\n"));
        }
      } else if (onChange) {
        console.log("Updating main content only");
        onChange(markdown);
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none" +
          " prose-headings:font-semibold" +
          " prose-h2:text-xl prose-h2:mb-4" +
          " prose-h3:text-lg prose-h3:mb-3" +
          " prose-p:text-base prose-p:leading-relaxed" +
          " prose-pre:text-sm",
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          // Prevent default behavior for Enter key in headers
          if (
            event.key === "Enter" &&
            view.state.selection.$head.parent.type.name === "heading"
          ) {
            event.preventDefault();
            return true;
          }
          return false;
        },
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
        onUpdateDocumentValues(placeholders);
      };

      fetchDocumentValues();
    } else if (content) {
      // If no documentId but we have content, just extract placeholders
      const placeholders = extractPlaceholders(content);
      onUpdateDocumentValues(placeholders);
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
    onUpdateDocumentValues(newValues);

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
      console.log("Content or values updated");

      const processedContent = replaceContentPlaceholders(content);
      const fullContent = displayHeader
        ? `${headerContent}\n---\n${processedContent}`
        : processedContent;

      updateEditorContent(fullContent);
    }
  }, [
    documentValues,
    content,
    editor,
    replaceContentPlaceholders,
    headerContent,
    displayHeader,
  ]);

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

  // Add this effect to check document status
  useEffect(() => {
    const checkDocumentStatus = async () => {
      if (!documentId) return;

      const { data: document, error } = await supabase
        .from("user_documents")
        .select("status")
        .eq("id", documentId)
        .single();

      if (error) {
        console.error("Error fetching document status:", error);
        return;
      }

      // Redirect if status is pending_signature or completed
      if (
        document.status === "pending_signature" ||
        document.status === "completed"
      ) {
        router.push(`/editor/document/${documentId}/tracking`);
      }
    };

    checkDocumentStatus();
  }, [documentId, supabase, router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <NextImage
            src="/logo.png"
            alt="DocWiz Logo"
            width={180}
            height={60}
            priority
            className="h-auto mb-4"
          />
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
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
        displayHeader={displayHeader}
        onDisplayHeaderChange={onDisplayHeaderChange}
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
