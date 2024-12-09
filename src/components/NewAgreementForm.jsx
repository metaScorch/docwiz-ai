import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react"; // Import the magic wand icon
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function NewAgreementForm() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate agreement using AI
      const response = await fetch('/api/generate-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          userId: user.id
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Create new document
      const { data: newDocument, error } = await supabase
        .from('user_documents')
        .insert([{
          user_id: user.id,
          content: data.content,
          title: data.title,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) throw error;

      // Redirect to editor
      router.push(`/editor/document/${newDocument.id}`);
    } catch (error) {
      console.error('Error:', error);
      // Add error handling/notification here
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">AI-Powered Generation</span>
        </div>
        <Textarea
          placeholder="Explain what agreement you need and for what purpose...
Example: I need a non-disclosure agreement for a freelance developer who will be working on my startup"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px]"
        />
        <p className="text-sm text-muted-foreground">
          Tip: Check our templates first to save time - we have many common agreements ready to use.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Generating..." : "Generate Agreement"}
      </Button>
    </form>
  );
}