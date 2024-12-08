"use client";

import { useEffect, useState, use } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Editor from "@/components/Editor";

export default function EditorPage({ params }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [template, setTemplate] = useState(null);
  const [content, setContent] = useState("");
  const templateId = use(params).templateId;

  useEffect(() => {
    async function fetchTemplate() {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) {
        console.error("Error fetching template:", error);
        return;
      }

      setTemplate(data);
      setContent(data.content);
    }

    fetchTemplate();
  }, [templateId]);

  if (!template) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{template.template_name}</h1>
        <Button onClick={() => router.back()}>Back</Button>
      </div>

      <Editor content={content} onChange={setContent} />
    </div>
  );
}
