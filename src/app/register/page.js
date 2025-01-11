"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import SignupStep from "../components/SignupStep";
import OrganizationTypeStep from "../components/OrganizationTypeStep";
import BusinessEntitySetupStep from "../components/BusinessEntitySetupStep";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [registrationId, setRegistrationId] = useState(null);
  const [email, setEmail] = useState("");

  // Check for existing session and registration
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Immediately redirect to verify-email page if user exists
        router.push("/verify-email");
        setEmail(user.email || "");
      }
    };

    checkSession();
  }, [router, supabase]);

  const handleSignupComplete = async (userData) => {
    // No need to handle email here anymore
    // The SignupStep component will handle the navigation
  };

  const handleOrganizationTypeComplete = () => {
    setCurrentStep(2);
  };

  const handleBusinessDetailsComplete = () => {
    setCurrentStep(3);
  };

  const totalSteps = 3;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleBack = () => {
    if (currentStep > 1) {
      // Don't allow going back from step 1
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCurrentStep = () => {
    return <SignupStep onNext={handleSignupComplete} />;
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
          {currentStep > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <span>{Math.round(progress)}% completed</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardHeader>
        <CardContent>{renderCurrentStep()}</CardContent>
        {currentStep === 0 && (
          <CardFooter>
            <p className="text-center text-sm text-muted-foreground w-full">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
