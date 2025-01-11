"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { extractBusinessDomain } from "@/utils/emailUtils";
import { Separator } from "@/components/ui/separator";
import { JurisdictionSearch } from "@/components/JurisdictionSearch";

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

const registrationTypes = [
  "LLC",
  "Sole Proprietorship",
  "Corporation",
  "Partnership",
  "Other",
];

export default function BusinessEntitySetupStep({
  onNext,
  onBack,
  registrationId,
  currentStep,
  totalSteps,
  skipEmailVerification = false,
}) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Business Details
    domain: "",
    description: "",
    industry: "",
    // Entity Details
    entityName: "",
    registrationType: "",
    jurisdiction: "",
    city_name: "",
    state_name: "",
    state_code: "",
    country_name: "",
    country_code: "",
    authorizedSignatory: "me",
    signatoryEmail: "",
  });

  const [isFetchingBusinessInfo, setIsFetchingBusinessInfo] = useState(false);

  useEffect(() => {
    fetchExistingData();
  }, []);

  const fetchExistingData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data: registration } = await supabase
        .from("registrations")
        .select("*")
        .eq("id", registrationId)
        .eq("user_id", user.id)
        .single();

      const businessDomain =
        registration?.domain || extractBusinessDomain(user.email);

      if (businessDomain && !registration?.domain) {
        fetchBusinessInfo(businessDomain);
      }

      if (registration) {
        setFormData({
          domain: businessDomain || "",
          description: registration.description || "",
          industry: registration.industry || "",
          entityName: registration.entity_name || "",
          registrationType: registration.registration_type || "",
          jurisdiction: registration.jurisdiction || "",
          city_name: registration.city_name || "",
          state_name: registration.state_name || "",
          state_code: registration.state_code || "",
          country_name: registration.country_name || "",
          country_code: registration.country_code || "",
          authorizedSignatory: registration.authorized_signatory || "me",
          signatoryEmail: registration.signatory_email || "",
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load existing details");
    }
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds < 60) return `in ${seconds} seconds`;
    if (seconds < 3600) return `in ${Math.ceil(seconds / 60)} minutes`;
    if (seconds < 86400) return `in ${Math.ceil(seconds / 3600)} hours`;
    return `in ${Math.ceil(seconds / 86400)} days`;
  };

  const fetchBusinessInfo = async (domain) => {
    setIsFetchingBusinessInfo(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await fetch("/api/fetch-business-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain, userId: user?.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(
            `Rate limit reached. Please try again ${formatTimeRemaining(data.resetIn)}`
          );
        } else {
          throw new Error(data.error || "Failed to fetch business information");
        }
        return;
      }

      setFormData((prev) => ({
        ...prev,
        description: data.description || prev.description,
        industry: data.industry || prev.industry,
      }));

      toast.success("Business information updated");
    } catch (error) {
      console.error("Error fetching business info:", error);
      toast.error("Failed to fetch business information");
    } finally {
      setIsFetchingBusinessInfo(false);
    }
  };

  const extractLocationData = (placeDetails) => {
    let cityName = "";
    let stateName = "";
    let stateCode = "";
    let countryName = "";
    let countryCode = "";

    placeDetails.address_components.forEach((component) => {
      if (component.types.includes("locality")) {
        cityName = component.long_name;
      }
      if (component.types.includes("administrative_area_level_1")) {
        stateName = component.long_name;
        stateCode = component.short_name;
      }
      if (component.types.includes("country")) {
        countryName = component.long_name;
        countryCode = component.short_name;
      }
    });

    return {
      city_name: cityName,
      state_name: stateName,
      state_code: stateCode,
      country_name: countryName,
      country_code: countryCode,
    };
  };

  const handleJurisdictionChange = (data) => {
    const locationData = extractLocationData(data.placeDetails);
    setFormData((prev) => ({
      ...prev,
      jurisdiction: data.fullJurisdiction,
      ...locationData,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data: existingReg } = await supabase
        .from("registrations")
        .select("id")
        .eq("id", registrationId)
        .eq("user_id", user.id)
        .single();

      if (!existingReg) {
        throw new Error("Registration not found or unauthorized");
      }

      const { error } = await supabase
        .from("registrations")
        .update({
          domain: formData.domain,
          description: formData.description,
          industry: formData.industry,
          entity_name: formData.entityName,
          registration_type: formData.registrationType,
          jurisdiction: formData.jurisdiction,
          city_name: formData.city_name,
          state_name: formData.state_name,
          state_code: formData.state_code,
          country_name: formData.country_name,
          country_code: formData.country_code,
          authorized_signatory: formData.authorizedSignatory,
          signatory_email: formData.signatoryEmail,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId)
        .eq("user_id", user.id);

      if (error) throw error;

      if (skipEmailVerification) {
        router.push("/dashboard");
      } else {
        router.push("/verify-email");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to save details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Complete Your Profile</h1>
        <p className="text-muted-foreground mt-2">
          Tell us more about your business
          <span className="block text-sm mt-1">
            Takes only 30 seconds to complete
          </span>
        </p>
      </div>
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Details Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Business Information</h2>

          <div className="space-y-2">
            <Label htmlFor="domain">
              Business Website{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={formData.domain}
              onChange={(e) =>
                setFormData({ ...formData, domain: e.target.value })
              }
              onBlur={(e) => {
                const domain = e.target.value.trim();
                if (domain) {
                  fetchBusinessInfo(domain);
                }
              }}
            />
            {isFetchingBusinessInfo && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Fetching business information...
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">
              Industry <span className="text-red-500">*</span>
            </Label>
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

          <div className="space-y-2">
            <Label htmlFor="description">
              Business Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
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
        </div>

        {/* Section Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Entity Details
            </span>
          </div>
        </div>

        {/* Entity Details Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entityName">
              Legal Entity Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="entityName"
              placeholder="Your company's legal name"
              value={formData.entityName}
              onChange={(e) =>
                setFormData({ ...formData, entityName: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="registrationType">
              Registration Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.registrationType}
              onValueChange={(value) =>
                setFormData({ ...formData, registrationType: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select registration type" />
              </SelectTrigger>
              <SelectContent>
                {registrationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jurisdiction">
              Jurisdiction <span className="text-red-500">*</span>
            </Label>
            <JurisdictionSearch
              value={formData.jurisdiction}
              onChange={handleJurisdictionChange}
              defaultValue="Select jurisdiction..."
            />
          </div>

          <div className="space-y-2">
            <Label>
              Authorized Signatory <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.authorizedSignatory}
              onValueChange={(value) =>
                setFormData({ ...formData, authorizedSignatory: value })
              }
              required
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="me" id="me" />
                <Label htmlFor="me">I am the authorized signatory</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="someone_else" id="someone_else" />
                <Label htmlFor="someone_else">Someone else will sign</Label>
              </div>
            </RadioGroup>
          </div>

          {formData.authorizedSignatory === "someone_else" && (
            <div className="space-y-2">
              <Label htmlFor="signatoryEmail">
                Signatory Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="signatoryEmail"
                type="email"
                placeholder="authorized.signer@company.com"
                value={formData.signatoryEmail}
                onChange={(e) =>
                  setFormData({ ...formData, signatoryEmail: e.target.value })
                }
                required
              />
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push("/verify-email")}
          >
            Skip
          </Button>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Complete Registration"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
