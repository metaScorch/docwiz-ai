"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { FcGoogle } from "react-icons/fc";
import { posthog } from "@/lib/posthog";

export default function SignIn() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);


  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProcessingAuth, setIsProcessingAuth] = useState(true);

  useEffect(() => {
    const checkSessionAndHash = async () => {
      try {
        setIsProcessingAuth(true);
        // Check if there's a hash in the URL (access_token)
        if (typeof window !== "undefined" && window.location.hash) {
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1) // Remove the # character
          );
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            // Set the session using the tokens
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) throw error;

            // Clear the hash from the URL
            window.location.hash = "";

            router.push("/dashboard");
            toast.success("Email verified successfully!");
            posthog.capture("email_verified", {
              success: true,
            });
            return;
          }
        }

        // Regular session check
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          router.push("/dashboard");
          toast.info("Already signed in");
        }
      } catch (error) {
        console.error("Error checking session:", error);
        toast.error("Failed to authenticate");
      } finally {
        setIsProcessingAuth(false);
      }
    };

    checkSessionAndHash();
  }, [router, supabase.auth]);

  if (isProcessingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Verifying your authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === "Email not confirmed") {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          toast.info("Please verify your email before continuing.");
          return;
        }
        throw error;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      router.push("/dashboard");
      toast.success("Signed in successfully!");
    } catch (error) {
      console.error("Error signing in:", error);
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      posthog.capture("auth_attempt", {
        provider: "google",
        success: true,
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
      toast.error("Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkSignIn = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      toast.success("Magic link sent to your email!");
      posthog.capture("magic_link_requested", {
        email_domain: email.split("@")[1],
      });
    } catch (error) {
      console.error("Error sending magic link:", error);
      toast.error(error.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex flex-col space-y-4">
            <div className="self-center">
              <Image
                src="/logo.png"
                alt="DocWiz Logo"
                width={120}
                height={40}
                priority
              />
            </div>
            <CardTitle className="text-xl">Sign In</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In with Password"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleMagicLinkSignIn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Magic Link...
                </>
              ) : (
                "Sign In with Magic Link"
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <FcGoogle className="mr-2 h-5 w-5" />
              Sign in with Google
            </Button>

            <div className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </div>

            <div className="text-center text-sm">
              <Link
                href="/forgot-password"
                className="text-blue-600 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
