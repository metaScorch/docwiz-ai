"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import OrganizationTypeStep from "../components/OrganizationTypeStep";
import BusinessDetailsStep from "../components/BusinessDetailsStep";
import EntityDetailsStep from "../components/EntityDetailsStep";
import { toast } from "sonner";

export default function CompleteSignupPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [registrationId, setRegistrationId] = useState(null);

  // Check for existing session and create registration if needed
  useEffect(() => {
    const initializeRegistration = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/sign-in");
          return;
        }

        // Check for existing registration
        const { data: existingReg, error: fetchError } = await supabase
          .from("registrations")
          .select("id, status")
          .eq("user_id", user.id)
          .maybeSingle(); // Using maybeSingle() instead of single() to avoid error

        if (existingReg) {
          if (existingReg.status === "completed") {
            router.push("/dashboard");
            return;
          }
          setRegistrationId(existingReg.id);
        } else {
          // Create new registration
          const { data: newReg, error: insertError } = await supabase
            .from("registrations")
            .insert([
              {
                user_id: user.id,
                status: "pending",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (insertError) throw insertError;
          setRegistrationId(newReg.id);
        }
      } catch (error) {
        console.error("Error initializing registration:", error);
        toast.error("Failed to initialize registration");
      }
    };

    initializeRegistration();
  }, [router, supabase]);

  const handleOrganizationTypeComplete = () => {
    setCurrentStep(1);
  };

  const handleBusinessDetailsComplete = () => {
    setCurrentStep(2);
  };

  const handleEntityDetailsComplete = async () => {
    try {
      // Update registration status to completed
      const { error } = await supabase
        .from("registrations")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId);

      if (error) throw error;

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing registration:", error);
      toast.error("Failed to complete registration");
    }
  };

  const renderCurrentStep = () => {
    if (!registrationId) return null;

    switch (currentStep) {
      case 0:
        return (
          <OrganizationTypeStep
            onNext={handleOrganizationTypeComplete}
            registrationId={registrationId}
          />
        );
      case 1:
        return (
          <BusinessDetailsStep
            onNext={handleBusinessDetailsComplete}
            registrationId={registrationId}
          />
        );
      case 2:
        return (
          <EntityDetailsStep
            onNext={handleEntityDetailsComplete}
            registrationId={registrationId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">{renderCurrentStep()}</div>
    </div>
  );
}
