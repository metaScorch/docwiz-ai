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

// Create a new lowlight instance with common languages
const lowlight = createLowlight(common);

// Add this custom extension for placeholders
const CustomPlaceholder = Extension.create({
  name: "customPlaceholder",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("customPlaceholder"),
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations = [];

            doc.descendants((node, pos) => {
              if (node.isText) {
                const regex = /\[([^\]]+)\]/g;
                let match;
                while ((match = regex.exec(node.text)) !== null) {
                  const start = pos + match.index;
                  const end = start + match[0].length;

                  decorations.push(
                    Decoration.inline(start, end, {
                      class: "custom-placeholder",
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

export default function Editor({ content, onChange, documentId }) {
  const [isMounted, setIsMounted] = useState(false);
  const [documentValues, setDocumentValues] = useState({});

  // Define all handler functions first
  const handleEditorUpdate = ({ editor }) => {
    const content = editor.getHTML();
    
    // Update document values based on editor content
    const newValues = {};
    Object.keys(documentValues).forEach((key) => {
      const placeholder = `[${key}]`;
      const regex = new RegExp(
        `${placeholder}|(?<=Name:\\s)([^\\n]+)|(?<=Address:\\s)([^\\n]+)`
      );
      const match = content.match(regex);
      if (match && match[0] !== placeholder) {
        newValues[key] = match[0];
      }
    });

    setDocumentValues((prev) => ({
      ...prev,
      ...newValues,
    }));

    // Call the parent's onChange handler
    if (onChange) {
      onChange(content);
    }
  };

  const handlePlaceholderChange = (key, value) => {
    setDocumentValues((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (editor) {
      editor.commands.command(({ tr, state }) => {
        let hasChanges = false;

        state.doc.descendants((node, pos) => {
          if (node.isText) {
            const text = node.text;
            const placeholder = `[${key}]`;
            const index = text.indexOf(placeholder);

            if (index > -1) {
              tr.delete(pos + index, pos + index + placeholder.length);
              tr.insertText(value || placeholder, pos + index);
              hasChanges = true;
            }
          }
        });

        return hasChanges;
      });
    }
  };

  const extractPlaceholders = useCallback((content) => {
    const regex = /\[([^\]]+)\]/g;
    const matches = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      matches.push({
        key: match[0],
        label: match[1],
        value: "",
      });
    }

    return matches;
  }, []);

  const initializeDocumentValues = useCallback(
    (content) => {
      const placeholders = extractPlaceholders(content);
      return placeholders.reduce((acc, placeholder) => {
        acc[placeholder.label] = placeholder.value;
        return acc;
      }, {});
    },
    [extractPlaceholders]
  );

  // Then initialize the editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
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
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      CustomPlaceholder,
    ],
    content,
    onCreate: ({ editor }) => {
      const initialValues = initializeDocumentValues(editor.getText());
      setDocumentValues(initialValues);
    },
    onUpdate: handleEditorUpdate,
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
    <div className="max-w-none flex">
      <div className="flex-1 border rounded-lg">
        <MenuBar editor={editor} />
        <EditorContent
          editor={editor}
          className="min-h-[calc(100vh-200px)] p-4"
        />
      </div>
      <Sidebar
        documentValues={documentValues}
        onValueChange={handlePlaceholderChange}
      />
    </div>
  );
}
