import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { extractBusinessDomain } from "@/utils/emailUtils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Other",
];

export default function BusinessDetailsStep({ onNext, registrationId }) {
  const supabase = createClientComponentClient();
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUserEmailAndDomain = async () => {
      try {
        const { data: registration } = await supabase
          .from("registrations")
          .select("domain")
          .eq("id", registrationId)
          .single();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Only set domain if it's not already set in registration
        if (!registration?.domain && user?.email) {
          const businessDomain = extractBusinessDomain(user.email);
          if (businessDomain) {
            setDomain(businessDomain);
          }
        } else if (registration?.domain) {
          setDomain(registration.domain);
        }
      } catch (error) {
        console.error("Error fetching user email:", error);
      }
    };

    fetchUserEmailAndDomain();
  }, [supabase.auth, registrationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("Updating registration:", registrationId, {
        domain,
        description,
        industry,
      });

      if (!registrationId) {
        throw new Error("Registration ID is missing");
      }

      const { error } = await supabase
        .from("registrations")
        .update({
          domain,
          description,
          industry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId);

      if (error) throw error;
      onNext({ domain, description, industry });
    } catch (error) {
      console.error("Failed to update business details:", error);
      // You might want to add error handling UI here
    }
  };

  const fetchBusinessInfo = async () => {
    if (!domain) {
      toast.error("Please enter a domain first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/fetch-business-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain }),
      });

      if (response.status === 429) {
        // Handle rate limit error
        const data = await response.json();
        const hours = Math.floor(data.resetIn / 3600);
        const minutes = Math.floor((data.resetIn % 3600) / 60);

        toast.error(
          `Rate limit exceeded. You can make ${data.limit} requests per ${data.period}. ` +
            `Please try again in ${hours}h ${minutes}m.`
        );
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch business information");
      }

      const data = await response.json();
      if (data.description) {
        setDescription(data.description);
        if (data.industry && industries.includes(data.industry)) {
          setIndustry(data.industry);
        }
        toast.success("Business information fetched successfully");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch business information");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="domain">Business Website</Label>
        <Input
          id="domain"
          placeholder="Enter business website"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="description">Business Description</Label>
          <Button
            type="button"
            onClick={fetchBusinessInfo}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              "Auto-fetch from website"
            )}
          </Button>
        </div>
        <Textarea
          id="description"
          placeholder="Enter business description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <Select value={industry} onValueChange={setIndustry} required>
          <SelectTrigger>
            <SelectValue placeholder="Select industry" />
          </SelectTrigger>
          <SelectContent>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind}>
                {ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">
        Next
      </Button>
    </form>
  );
}
