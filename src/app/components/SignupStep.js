"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { CardTitle, CardDescription } from "@/components/ui/card";

export default function SignupStep({ onNext }) {
  const supabase = createClientComponentClient();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to sign up with Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setIsEmailLoading(true);
    setEmailError("");

    try {
      // First check if email exists
      const checkResponse = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        if (checkResponse.status === 400) {
          // Email exists, send magic link
          const { error: magicLinkError } = await supabase.auth.signInWithOtp({
            email: formData.email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (magicLinkError) throw magicLinkError;

          setEmailError(
            "This email is already registered. We've sent you a magic link to sign in!"
          );
          toast.success(
            "This email is already registered. We've sent you a magic link to sign in!"
          );
          return;
        }
        throw new Error(checkData.error || "Failed to check email");
      }

      // Email is available, proceed with signup
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: formData.fullName },
        },
      });
      if (error) throw error;

      // Create new registration
      const { data: regData, error: regError } = await supabase
        .from("registrations")
        .insert({
          user_id: data.user?.id,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (regError) throw regError;

      // Move to next step with registration data
      onNext({
        id: data.user?.id,
        email: formData.email,
        registrationId: regData.id,
      });
    } catch (error) {
      console.error("Error:", error);
      setEmailError(error.message);
      toast.error(error.message);
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold">
          Create your account
        </CardTitle>
        <CardDescription>Get started with DocWiz</CardDescription>
      </div>

      {emailError && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>{emailError}</AlertDescription>
        </Alert>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignUp}
        disabled={isGoogleLoading || isEmailLoading}
      >
        {isGoogleLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Signing up with Google...
          </>
        ) : (
          <>
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              ></path>
            </svg>
            Continue with Google
          </>
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <form onSubmit={handleEmailSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            placeholder="John Doe"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Password must be at least 8 characters long
          </AlertDescription>
        </Alert>

        <Button
          type="submit"
          className="w-full"
          disabled={isGoogleLoading || isEmailLoading}
        >
          {isEmailLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>
    </div>
  );
}
