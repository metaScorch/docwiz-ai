"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import SignupStep from "../components/SignupStep";
import OrganizationTypeStep from "../components/OrganizationTypeStep";
import BusinessDetailsStep from "../components/BusinessDetailsStep";
import EntityDetailsStep from "../components/EntityDetailsStep";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [registrationId, setRegistrationId] = useState(null);
  const [email, setEmail] = useState("");

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // If user exists, check for existing registration
        const { data: registration } = await supabase
          .from("registrations")
          .select("id, status")
          .eq("user_id", user.id)
          .single();

        if (registration) {
          setRegistrationId(registration.id);
          // If registration exists but incomplete, continue from last step
          if (registration.status === "completed") {
            if (!user.email_confirmed_at) {
              router.push("/verify-email");
            } else {
              router.push("/dashboard");
            }
          }
        }
        setEmail(user.email || "");
      }
    };

    checkSession();
  }, [router, supabase]);

  const handleSignupComplete = async (userData) => {
    try {
      // Create registration record after successful signup
      const { data: registration, error } = await supabase
        .from("registrations")
        .insert([
          {
            user_id: userData.id,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setRegistrationId(registration.id);
      setEmail(userData.email);
      setCurrentStep(1);
    } catch (error) {
      console.error("Error creating registration:", error);
      toast.error("Failed to initialize registration");
    }
  };

  const handleOrganizationTypeComplete = () => {
    setCurrentStep(2);
  };

  const handleBusinessDetailsComplete = () => {
    setCurrentStep(3);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <SignupStep onNext={handleSignupComplete} />;
      case 1:
        return (
          <OrganizationTypeStep
            onNext={handleOrganizationTypeComplete}
            registrationId={registrationId}
          />
        );
      case 2:
        return (
          <BusinessDetailsStep
            onNext={handleBusinessDetailsComplete}
            registrationId={registrationId}
          />
        );
      case 3:
        return (
          <EntityDetailsStep
            onNext={() => {}} // Navigation handled within component
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
