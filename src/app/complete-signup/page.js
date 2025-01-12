"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import OrganizationTypeStep from "../components/OrganizationTypeStep";
import BusinessEntitySetupStep from "../components/BusinessEntitySetupStep";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";

function CompleteSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [registrationId, setRegistrationId] = useState(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/sign-in");
          return;
        }

        // First check for existing registration for this user
        const { data: registration, error: fetchError } = await supabase
          .from("registrations")
          .select("id, status, organization_type")
          .eq("user_id", user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (registration) {
          // Existing registration found
          setRegistrationId(registration.id);

          if (registration.status === "completed") {
            router.push("/dashboard");
          } else if (registration.organization_type) {
            setCurrentStep(1);
          } else {
            setCurrentStep(0);
          }
        } else {
          // No registration exists, create one
          const { data: newReg, error: insertError } = await supabase
            .from("registrations")
            .upsert(
              {
                user_id: user.id,
                status: "pending",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "user_id",
                ignoreDuplicates: false,
              }
            )
            .select()
            .single();

          if (insertError) throw insertError;
          setRegistrationId(newReg.id);
        }

        setEmail(user.email || "");
      } catch (error) {
        console.error("Error checking session:", error);
        toast.error("Failed to initialize registration");
      }
    };

    checkSession();
  }, [router, supabase]);

  const handleOrganizationTypeComplete = () => {
    setCurrentStep(1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const totalSteps = 2;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const renderCurrentStep = () => {
    if (!registrationId) return null;

    switch (currentStep) {
      case 0:
        return (
          <OrganizationTypeStep
            onNext={handleOrganizationTypeComplete}
            registrationId={registrationId}
            currentStep={currentStep + 1}
            totalSteps={totalSteps}
          />
        );
      case 1:
        return (
          <BusinessEntitySetupStep
            onNext={() => {}}
            onBack={handleBack}
            registrationId={registrationId}
            currentStep={currentStep + 1}
            totalSteps={totalSteps}
            skipEmailVerification={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-purple-100 dark:from-blue-950 dark:to-purple-900">
      <Card className="w-full max-w-[600px]">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="DocWiz Logo"
              width={200}
              height={60}
              priority
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span>{Math.round(progress)}% completed</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        <CardContent>{renderCurrentStep()}</CardContent>
      </Card>
    </div>
  );
}

export default function CompleteSignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompleteSignupContent />
    </Suspense>
  );
}
