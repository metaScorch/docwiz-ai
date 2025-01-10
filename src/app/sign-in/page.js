"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// A simple sign-in page
export default function SignInPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  // UI states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Check if user is already signed in
  useEffect(() => {
    checkSessionOnMount();
  }, []);

  async function checkSessionOnMount() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        // If user is already logged in, navigate to dashboard
        router.push("/dashboard");
      }
    } catch (error) {
      // ignore for now
    }
  }

  // Switch between "magic link" form and "password" form
  const toggleMagicLink = () => {
    setShowMagicLink(!showMagicLink);
    setPassword(""); // reset password when toggling
    setErrorMsg("");
  };

  // Core sign-in function
  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      // If using magic link
      if (showMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`, // auto-login after email confirm
            shouldCreateUser: false, // only if you want to block new-user creation
          },
        });
        if (error) throw error;
        alert("Magic link sent! Check your email.");
        return;
      }

      // Else sign in with email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // If user’s email is not confirmed, you can handle that logic here:
      // e.g., if (!data.user.email_confirmed_at) { ... }

      // If success, navigate to dashboard
      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth sign in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // let supabase handle
        },
      });
      if (error) throw error;
      // The user will be redirected automatically by Supabase
    } catch (err) {
      setErrorMsg(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 16 }}>
      <h1>Sign In</h1>

      {errorMsg && (
        <div style={{ background: "#fee2e2", padding: 8, marginBottom: 8 }}>
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleGoogleSignIn}
        style={{
          width: "100%",
          padding: "8px 16px",
          marginBottom: 8,
          cursor: "pointer",
        }}
        disabled={isLoading}
      >
        Sign In With Google
      </button>

      <button
        onClick={toggleMagicLink}
        style={{ width: "100%", padding: "8px 16px", marginBottom: 16 }}
      >
        {showMagicLink ? "Use Password Instead" : "Use Magic Link Instead"}
      </button>

      <form onSubmit={handleSignIn}>
        <div style={{ marginBottom: 8 }}>
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>

        {!showMagicLink && (
          <div style={{ marginBottom: 8 }}>
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>
        )}

        <button
          type="submit"
          style={{ width: "100%", padding: "8px 16px", cursor: "pointer" }}
          disabled={isLoading}
        >
          {isLoading
            ? "Loading..."
            : showMagicLink
              ? "Send Magic Link"
              : "Sign In"}
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        Don’t have an account? <Link href="/register">Register Here</Link>
      </div>
    </div>
  );
}
