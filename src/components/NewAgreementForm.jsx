import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react"; // Import the magic wand icon
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Select } from "@/components/ui/select";
import { JurisdictionSearch } from "@/components/JurisdictionSearch";
import { Slider } from "@/components/ui/slider";

export function NewAgreementForm() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [jurisdiction, setJurisdiction] = useState("");
  const [userRegistration, setUserRegistration] = useState(null);
  const [complexity, setComplexity] = useState(3);
  const [length, setLength] = useState(3);
  const [jurisdictionError, setJurisdictionError] = useState(false);

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
    
    // Add jurisdiction validation
    if (!jurisdiction) {
      setJurisdictionError(true);
      return;
    }
    setJurisdictionError(false);
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
          jurisdiction,
          complexity,
          length
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

  const getComplexityLabel = (value) => {
    const labels = {
      1: "Simple, easy to understand",
      2: "Basic legal terms",
      3: "Standard legal language",
      4: "Detailed legal terminology",
      5: "Complex legal language"
    };
    return labels[value];
  };

  const getLengthLabel = (value) => {
    const labels = {
      1: "Very brief",
      2: "Concise",
      3: "Standard",
      4: "Detailed",
      5: "Comprehensive"
    };
    return labels[value];
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
        <label className="text-sm text-muted-foreground">
          Jurisdiction <span className="text-red-500">*</span>
        </label>
        <JurisdictionSearch
          value={jurisdiction}
          onChange={setJurisdiction}
          defaultValue={userRegistration ? 
            `${userRegistration.city_name}, ${userRegistration.state_name}, ${userRegistration.country_name}` : 
            "Select jurisdiction"
          }
        />
        {jurisdictionError && (
          <p className="text-sm text-red-500">
            Please select a jurisdiction
          </p>
        )}
        {userRegistration && (
          <p className="text-sm text-muted-foreground">
            Default jurisdiction based on your registration
          </p>
        )}
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Wording Complexity</label>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[complexity]}
            onValueChange={([value]) => setComplexity(value)}
            className="w-full"
            style={{
              "--slider-color": "#0700c7"
            }}
          />
          <p className="text-sm text-muted-foreground">{getComplexityLabel(complexity)}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Agreement Length</label>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[length]}
            onValueChange={([value]) => setLength(value)}
            className="w-full"
            style={{
              "--slider-color": "#0700c7"
            }}
          />
          <p className="text-sm text-muted-foreground">{getLengthLabel(length)}</p>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Generating..." : "Generate Agreement"}
      </Button>
    </form>
  );
}