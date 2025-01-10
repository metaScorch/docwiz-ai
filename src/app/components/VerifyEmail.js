"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function VerifyEmail() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        if (user.email_confirmed_at) {
          // If email is already verified, redirect to dashboard
          router.push("/dashboard");
        } else {
          setEmail(user.email || "");
        }
      }
    };

    checkUser();
  }, [router, supabase.auth]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (resendDisabled) return;

    setIsLoading(true);
    setResendDisabled(true);
    setCountdown(60); // 60 second cooldown

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) throw error;
      toast.success("Verification email sent successfully");
    } catch (error) {
      console.error("Error sending verification email:", error);
      toast.error("Failed to send verification email");
      setResendDisabled(false);
      setCountdown(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/sign-in");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 p-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-3 rounded-full">
            <Mail className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted-foreground">
          We sent a verification link to
          <br />
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleResendEmail}
          disabled={isLoading || resendDisabled}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {resendDisabled
            ? `Resend email in ${countdown}s`
            : "Resend verification email"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/dashboard")}
        >
          Continue to dashboard
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Didn&apos;t receive the email? Check your spam folder or try signing in
        with a different email address.
      </p>
    </div>
  );
}
