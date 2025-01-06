"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SignupStep from "../components/SignupStep";
import OrganizationTypeStep from "../components/OrganizationTypeStep";
import BusinessDetailsStep from "../components/BusinessDetailsStep";
import EntityDetailsStep from "../components/EntityDetailsStep";

const steps = [
  "Signup",
  "Organization Type",
  "Business Details",
  "Entity Details",
];

export default function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);

  const handleNext = (stepData) => {
    if (!stepData.error) {
      setError(null);
      setFormData({ ...formData, ...stepData });
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  console.log("Rendered with formData:", formData); // Debug log

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    console.log("Form submitted:", formData);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <SignupStep onNext={handleNext} onError={handleError} />;
      case 1:
        return (
          <OrganizationTypeStep
            onNext={handleNext}
            registrationId={formData.registrationId}
          />
        );
      case 2:
        return (
          <BusinessDetailsStep
            onNext={handleNext}
            registrationId={formData.registrationId}
          />
        );
      case 3:
        return (
          <EntityDetailsStep
            onNext={handleSubmit}
            registrationId={formData.registrationId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {currentStep > 0 ? steps[currentStep] : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
              <Button
                variant="link"
                className="text-red-700 hover:text-red-900 ml-2"
                onClick={() => (window.location.href = "/sign-in")}
              >
                Sign in
              </Button>
            </div>
          )}
          {renderStep()}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentStep ? "bg-blue-500" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          {currentStep === 0 && (
            <Button
              variant="link"
              className="text-blue-600 hover:text-blue-800"
              onClick={() => (window.location.href = "/sign-in")}
            >
              Already have an account? Login
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
