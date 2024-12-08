import { useState } from "react";
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

  const fetchData = () => {
    setDescription(
      "This is a pre-filled business description based on the fetched data."
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="domain">Business Domain</Label>
        <div className="flex space-x-2">
          <Input
            id="domain"
            placeholder="Enter business domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
          <Button type="button" onClick={fetchData}>
            Fetch Data
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Business Description</Label>
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
        <Select onValueChange={setIndustry} required>
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
