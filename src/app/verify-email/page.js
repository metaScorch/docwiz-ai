"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Create a separate component for the verification content
function VerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient();
  const [countdown, setCountdown] = useState(60);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const cooldownTimer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const checkEmailVerification = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Only proceed with verification check if we have a session
        if (session) {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();

          if (error) throw error;

          if (user?.email_confirmed_at) {
            await supabase.auth.refreshSession();
            router.push("/dashboard");
          }
        }
      } catch (error) {
        console.error("Error checking verification:", error);
        toast.error("Failed to verify email status");
      }
    };

    // Check every 3 seconds
    const verificationChecker = setInterval(checkEmailVerification, 3000);

    // Check for valid session on mount
    const checkSession = async () => {
      try {
        setIsVerifying(true);
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        // If no session, check for email in URL params
        if (!session) {
          const emailFromUrl = searchParams.get("email");
          if (emailFromUrl) {
            setUserEmail(emailFromUrl);
            return;
          }
          router.push("/sign-in");
          return;
        }

        // Store the email for display and verification
        setUserEmail(session.user.email);

        // If already verified, redirect to dashboard
        if (session.user.email_confirmed_at) {
          router.push("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Session check error:", error);
        toast.error("Unable to verify session");
        router.push("/sign-in");
      } finally {
        setIsVerifying(false);
      }
    };

    checkSession();

    return () => {
      clearInterval(timer);
      clearInterval(cooldownTimer);
      clearInterval(verificationChecker);
    };
  }, [router, supabase.auth, searchParams]);

  const handleResendEmail = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: userEmail,
      });

      if (error) throw error;

      // Set cooldown to 60 seconds
      setResendCooldown(60);
      toast.success("Verification email resent successfully!");
    } catch (error) {
      console.error("Error resending verification email:", error);
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Verify Your Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {userEmail && (
            <p className="text-center text-gray-600">
              We&apos;ve sent a verification email to{" "}
              <span className="font-medium">{userEmail}</span>
            </p>
          )}
          <p className="text-center text-sm text-gray-500">
            You'll be automatically redirected once your email is verified.
          </p>
          {countdown > 0 && (
            <p className="text-center text-sm text-gray-500">
              Checking for verification... ({countdown}s)
            </p>
          )}

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || loading}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              {loading
                ? "Sending..."
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend verification email"}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500">
            Don't see the email? Check your spam folder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Main component with Suspense wrapper
export default function VerifyEmail() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center">
          <Card className="w-full max-w-md p-6">
            <div className="text-center">Loading...</div>
          </Card>
        </div>
      }
    >
      <VerificationContent />
    </Suspense>
  );
}
