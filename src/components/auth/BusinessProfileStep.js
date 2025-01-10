"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { industries } from "@/data/industries";
import useAuthStore from "@/stores/authStore";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { extractBusinessDomain } from "@/utils/emailUtils";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

const organizationTypes = [
  {
    type: "Individual",
    description: "Perfect for freelancers and solo entrepreneurs",
  },
  {
    type: "SMB",
    description: "Ideal for small and medium-sized businesses",
  },
  {
    type: "Startup",
    description: "Built for fast-growing companies and teams",
  },
  {
    type: "Enterprise",
    description: "Designed for large organizations with complex needs",
  },
];

export default function BusinessProfileStep() {
  const supabase = createClientComponentClient();
  const { user, updateRegistrationData, setCurrentStep, registrationData } =
    useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    organizationType: registrationData?.organizationType || "",
    domain: registrationData?.domain || "",
    description: registrationData?.description || "",
    industry: registrationData?.industry || "",
  });

  // Auto-fetch business info when domain is provided
  const handleFetchBusinessInfo = async () => {
    if (!formData.domain) {
      toast.error("Please enter a domain first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/fetch-business-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: formData.domain, userId: user.id }),
      });

      if (response.status === 429) {
        const data = await response.json();
        const hours = Math.floor(data.resetIn / 3600);
        const minutes = Math.floor((data.resetIn % 3600) / 60);

        toast.error(
          `Rate limit exceeded. You can make ${data.limit} requests per ${data.period}. ` +
            `Please try again in ${hours}h ${minutes}m.`
        );
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch business information");
      }

      setFormData((prev) => ({
        ...prev,
        description: data.description || prev.description,
        industry: data.industry || prev.industry,
      }));

      toast.success("Business information fetched successfully");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to fetch business information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create or update registration record
      const { error: upsertError } = await supabase
        .from("registrations")
        .upsert({
          user_id: user.id,
          organization_type: formData.organizationType,
          domain: formData.domain || extractBusinessDomain(user.email),
          description: formData.description,
          industry: formData.industry,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      // Update registration data in store
      updateRegistrationData(formData);

      // Move to next step
      setCurrentStep(2);
    } catch (error) {
      console.error("Error saving business profile:", error);
      toast.error("Failed to save business profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Organization Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {organizationTypes.map(({ type, description }) => (
              <div
                key={type}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.organizationType === type
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-primary/50"
                }`}
                onClick={() =>
                  setFormData({ ...formData, organizationType: type })
                }
              >
                <h3 className="font-medium">{type}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="domain">Business Website</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleFetchBusinessInfo}
              disabled={isLoading || !formData.domain}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Auto-fetch Info
                </>
              )}
            </Button>
          </div>
          <Input
            id="domain"
            placeholder="www.example.com"
            value={formData.domain}
            onChange={(e) =>
              setFormData({ ...formData, domain: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Business Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your business..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Select
            value={formData.industry}
            onValueChange={(value) =>
              setFormData({ ...formData, industry: value })
            }
            required
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
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    </form>
  );
}
