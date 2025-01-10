"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function VerifyEmailPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // We'll read ?email= from the URL
  const [email, setEmail] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const queryEmail = searchParams.get("email") || "";
    setEmail(queryEmail);

    checkIfVerified();
  }, []);

  async function checkIfVerified() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        // If there's an error, user might be signed out or something else
        setIsLoading(false);
        setMessage(error.message);
        return;
      }

      // If user’s email is confirmed, then skip to dashboard
      if (data?.user?.email_confirmed_at) {
        setIsVerified(true);
        router.push("/dashboard");
        return;
      }
    } catch (err) {
      setMessage(err.message);
    }
    setIsLoading(false);
  }

  // Resend the confirmation email
  async function handleResendEmail() {
    if (!email) return;
    setResendLoading(true);
    setMessage("");
    try {
      // Supabase does not have a direct "resend" in v2, so we can signUp again
      // or use `auth.resend()` from next versions if available. We'll do signUp:
      const { error } = await supabase.auth.signUp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;

      setMessage("Verification email resent. Check your inbox/spam!");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setResendLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 16 }}>
        <h1>Verifying...</h1>
        <p>Please wait while we check your verification status.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 16 }}>
      <h1>Verify Your Email</h1>
      {isVerified ? (
        <p>You are verified. Redirecting...</p>
      ) : (
        <>
          <p>
            We’ve sent a verification link to: <strong>{email}</strong>
          </p>
          <p>
            Please click that link to confirm your email. Once confirmed, you’ll
            be automatically logged in.
          </p>
          {message && (
            <div style={{ backgroundColor: "#eef", marginTop: 8, padding: 8 }}>
              {message}
            </div>
          )}
          <button
            onClick={handleResendEmail}
            disabled={resendLoading}
            style={{ marginTop: 16 }}
          >
            {resendLoading ? "Resending..." : "Resend Verification Email"}
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            style={{ marginLeft: 8, marginTop: 16 }}
          >
            Go to Dashboard (if verified)
          </button>
        </>
      )}
    </div>
  );
}
