"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { JurisdictionSearch } from "@/components/JurisdictionSearch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2 } from "lucide-react";
import useAuthStore from "@/stores/authStore";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

const registrationTypes = [
  "LLC",
  "Sole Proprietor",
  "Corporation",
  "Partnership",
  "Other",
];

export default function LegalDetailsStep() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { user, registrationData, updateRegistrationData } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    entityName: registrationData?.entityName || "",
    registrationType: registrationData?.registrationType || "",
    jurisdiction: registrationData?.jurisdiction || "",
    authorizedSignatory: registrationData?.authorizedSignatory || "me",
    signatoryEmail: registrationData?.signatoryEmail || "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      formData.authorizedSignatory === "someone_else" &&
      !formData.signatoryEmail
    ) {
      toast.error(
        "Signatory email is required when delegating signing authority"
      );
      return;
    }

    setIsLoading(true);

    try {
      // Get existing registration
      const { data: registration, error: fetchError } = await supabase
        .from("registrations")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update registration with legal details
      const { error: updateError } = await supabase
        .from("registrations")
        .update({
          entity_name: formData.entityName,
          registration_type: formData.registrationType,
          jurisdiction: formData.jurisdiction,
          authorized_signatory: formData.authorizedSignatory,
          signatory_email:
            formData.authorizedSignatory === "someone_else"
              ? formData.signatoryEmail
              : null,
          updated_at: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", registration.id);

      if (updateError) throw updateError;

      // Store final registration data
      updateRegistrationData(formData);

      // Check email verification status
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser?.email_confirmed_at) {
        // If email is not verified, redirect to verify email page
        router.push("/verify-email");
      } else {
        // If email is verified, proceed to dashboard
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error saving legal details:", error);
      toast.error("Failed to save legal details");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entityName">Entity Name</Label>
          <Input
            id="entityName"
            placeholder="Enter legal entity name"
            value={formData.entityName}
            onChange={(e) =>
              setFormData({ ...formData, entityName: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="registrationType">Registration Type</Label>
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
          <Label>Jurisdiction</Label>
          <JurisdictionSearch
            value={formData.jurisdiction}
            onChange={(value) =>
              setFormData({ ...formData, jurisdiction: value })
            }
          />
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Selecting the correct jurisdiction is crucial for ensuring the
            validity of your documents and compliance with local regulations.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Authorized Signatory</Label>
          <RadioGroup
            value={formData.authorizedSignatory}
            onValueChange={(value) =>
              setFormData({ ...formData, authorizedSignatory: value })
            }
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="me" id="me" />
              <Label htmlFor="me">I will be the signatory</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="someone_else" id="someone_else" />
              <Label htmlFor="someone_else">
                Someone else will be the signatory
              </Label>
            </div>
          </RadioGroup>
        </div>

        {formData.authorizedSignatory === "someone_else" && (
          <div className="space-y-2">
            <Label htmlFor="signatoryEmail">Signatory Email</Label>
            <Input
              id="signatoryEmail"
              type="email"
              placeholder="Enter signatory email"
              value={formData.signatoryEmail}
              onChange={(e) =>
                setFormData({ ...formData, signatoryEmail: e.target.value })
              }
              required
            />
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finalizing...
            </>
          ) : (
            "Complete Registration"
          )}
        </Button>
      </div>
    </form>
  );
}
