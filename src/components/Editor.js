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

// Create a new lowlight instance with common languages
const lowlight = createLowlight(common);

export default function Editor({ content, onChange }) {
  const [isMounted, setIsMounted] = useState(false);
  const [placeholders, setPlaceholders] = useState([]);

  // Add this function to extract placeholders from content
  const extractPlaceholders = useCallback((content) => {
    const regex = /\[([^\]]+)\]/g;
    const matches = content.match(regex) || [];
    const uniqueMatches = [...new Set(matches)];
    
    return uniqueMatches.map(match => ({
      key: match,
      label: match.replace(/[\[\]]/g, ''),
      value: ''
    }));
  }, []);

  // Update editor configuration
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
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      const extractedPlaceholders = extractPlaceholders(editor.getText());
      setPlaceholders(extractedPlaceholders);
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

  // Add placeholder change handler
  const handlePlaceholderChange = (key, value) => {
    setPlaceholders(prev =>
      prev.map(p => p.key === key ? { ...p, value } : p)
    );
    
    if (editor) {
      const content = editor.getText();
      const updatedContent = content.replace(key, value);
      editor.commands.setContent(updatedContent);
    }
  };

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
        placeholders={placeholders}
        onPlaceholderChange={handlePlaceholderChange}
      />
    </div>
  );
}
