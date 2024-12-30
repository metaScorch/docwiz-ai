import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react"; // Import the magic wand icon
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Select } from "@/components/ui/select";
import { JurisdictionSearch } from "@/components/JurisdictionSearch";

export function NewAgreementForm() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [jurisdiction, setJurisdiction] = useState("");
  const [userRegistration, setUserRegistration] = useState(null);

  useEffect(() => {
    const fetchUserRegistration = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('registrations')
          .select('city_name, state_name, country_name')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setUserRegistration(data);
          // Set default jurisdiction from registration
          setJurisdiction(`${data.city_name}, ${data.state_name}, ${data.country_name}`);
        }
      }
    };

    fetchUserRegistration();
  }, [supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/generate-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          userId: user.id,
          jurisdiction
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Just redirect to the document created by the API
      router.push(`/editor/document/${data.id}`);
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
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Jurisdiction</label>
        <JurisdictionSearch
          value={jurisdiction}
          onChange={setJurisdiction}
          defaultValue={userRegistration ? 
            `${userRegistration.city_name}, ${userRegistration.state_name}, ${userRegistration.country_name}` : 
            undefined
          }
        />
        {userRegistration && (
          <p className="text-sm text-muted-foreground">
            Default jurisdiction based on your registration
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Generating..." : "Generate Agreement"}
      </Button>
    </form>
  );
}