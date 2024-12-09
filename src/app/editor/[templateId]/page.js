"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Editor from "@/components/Editor";

export default function EditorPage({ params }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [userDocument, setUserDocument] = useState(null);
  const [content, setContent] = useState("");
  const { templateId } = params;

  useEffect(() => {
    async function initializeDocument() {
      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error getting user:", userError);
        return;
      }

      // First, fetch the template
      const { data: template, error: templateError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) {
        console.error("Error fetching template:", templateError);
        return;
      }

      // Create a new user document
      const { data: newDocument, error: documentError } = await supabase
        .from("user_documents")
        .insert([
          {
            user_id: user.id,
            template_id: templateId,
            content: template.content,
            title: template.template_name,
            status: "draft",
          },
        ])
        .select()
        .single();

      if (documentError) {
        console.error("Error creating user document:", documentError);
        return;
      }

      setUserDocument(newDocument);
      setContent(newDocument.content);
    }

    initializeDocument();
  }, [templateId, supabase]);

  const handleContentChange = async (newContent) => {
    setContent(newContent);
    
    // Update the user document in the database
    const { error } = await supabase
      .from('user_documents')
      .update({ 
        content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', userDocument.id);

    if (error) {
      console.error('Error updating document:', error);
    }
  };

  if (!userDocument) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{userDocument.title}</h1>
        <Button onClick={() => router.back()}>Back</Button>
      </div>

      <Editor 
        content={content} 
        onChange={handleContentChange}
        documentId={userDocument?.id} 
      />
    </div>
  );
}
