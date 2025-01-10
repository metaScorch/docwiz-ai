"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { extractBusinessDomain } from "@/utils/emailUtils";

const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
  "Professional Services",
  "Media & Entertainment",
  "Real Estate",
  "Other",
];

export default function BusinessDetailsStep({ onNext, registrationId }) {
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    domain: "",
    description: "",
    industry: "",
  });

  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        // Get registration data if it exists
        const { data: registration } = await supabase
          .from("registrations")
          .select("domain, description, industry")
          .eq("id", registrationId)
          .single();

        if (registration) {
          setFormData({
            domain: registration.domain || "",
            description: registration.description || "",
            industry: registration.industry || "",
          });
        }

        // If no domain is set, try to extract it from user's email
        if (!registration?.domain) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.email) {
            const businessDomain = extractBusinessDomain(user.email);
            if (businessDomain) {
              setFormData((prev) => ({ ...prev, domain: businessDomain }));
            }
          }
        }
      } catch (error) {
        console.error("Error fetching business details:", error);
        toast.error("Failed to load existing business details");
      }
    };

    fetchExistingData();
  }, [registrationId, supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!registrationId) {
        throw new Error("Registration ID is missing");
      }

      const { error } = await supabase
        .from("registrations")
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId);

      if (error) throw error;
      onNext(formData);
    } catch (error) {
      console.error("Failed to update business details:", error);
      toast.error("Failed to save business details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusinessInfo = async () => {
    if (!formData.domain) {
      toast.error("Please enter a domain first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/fetch-business-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: formData.domain }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch business information");
      }

      const data = await response.json();
      if (data.description || data.industry) {
        setFormData((prev) => ({
          ...prev,
          description: data.description || prev.description,
          industry: data.industry || prev.industry,
        }));
        toast.success("Business information updated");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to fetch business information");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Business Details</h1>
        <p className="text-muted-foreground mt-2">
          Tell us more about your business
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="domain">Business Website</Label>
          <div className="flex gap-2">
            <Input
              id="domain"
              placeholder="example.com"
              value={formData.domain}
              onChange={(e) =>
                setFormData({ ...formData, domain: e.target.value })
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={fetchBusinessInfo}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Auto-fill"
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select
            value={formData.industry}
            onValueChange={(value) =>
              setFormData({ ...formData, industry: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Business Description</Label>
          <Textarea
            id="description"
            placeholder="Tell us about your business..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={4}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onNext(formData)}
          >
            Skip
          </Button>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Next
          </Button>
        </div>
      </form>
    </div>
  );
}
