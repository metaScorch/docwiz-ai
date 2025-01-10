"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";

// Minimal register flow with multi-step form
export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Steps: 0 -> initial sign up, 1 -> business details, 2 -> org details
  const [currentStep, setCurrentStep] = useState(0);

  // Form fields for the entire multi-step process
  // Step 0: email, password, fullName
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Step 1: business info
  const [organizationType, setOrganizationType] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");

  // Step 2: org details
  const [entityName, setEntityName] = useState("");
  const [registrationType, setRegistrationType] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [authorizedSignatory, setAuthorizedSignatory] = useState("me");
  const [signatoryEmail, setSignatoryEmail] = useState("");

  // misc
  const [registrationId, setRegistrationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // If user is already signed in, maybe redirect from here
  useEffect(() => {
    checkSessionOnMount();
  }, []);

  async function checkSessionOnMount() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // Possibly redirect if user is already logged in
      // router.push("/dashboard");
      // Or let them re-register if you want. We'll leave it as is.
    }
  }

  // Step 0: Basic sign up with email/password
  const handleRegisterWithEmail = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      // 1. Sign up with email/password via Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: fullName },
        },
      });
      if (error) throw error;

      // 2. Once supabase user is created, create a row in "registrations" table
      //    This row can be updated in subsequent steps
      const { data: regData, error: regErr } = await supabase
        .from("registrations")
        .insert({
          user_id: data.user?.id,
          status: "pending",
        })
        .select()
        .single();
      if (regErr) throw regErr;

      setRegistrationId(regData.id);
      setCurrentStep(1); // Move to next step
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // If skipping step 1, you can just call setCurrentStep(2)
  const skipBusinessStep = () => {
    setCurrentStep(2);
  };

  // Step 1: Save business details
  const handleBusinessNext = async (e) => {
    e.preventDefault();
    if (!registrationId) {
      setCurrentStep(2);
      return;
    }
    setIsLoading(true);
    setErrorMsg("");

    try {
      // update the existing registration row
      const { error } = await supabase
        .from("registrations")
        .update({
          organization_type: organizationType,
          domain,
          description,
          industry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId);

      if (error) throw error;
      setCurrentStep(2);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Save org details
  const skipOrgStep = () => {
    // Just navigate to verify email page
    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  };

  const handleOrgSubmit = async (e) => {
    e.preventDefault();
    if (!registrationId) {
      // If no registration row, just go verify email
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      // update the row with final details
      const { error } = await supabase
        .from("registrations")
        .update({
          entity_name: entityName,
          registration_type: registrationType,
          jurisdiction,
          authorized_signatory: authorizedSignatory,
          signatory_email:
            authorizedSignatory === "someone_else" ? signatoryEmail : null,
          status: "completed", // or "pending_email_verification"
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId);

      if (error) throw error;

      // Finally, direct user to verify email (if email/password).
      // If user used Google OAuth, supabase automatically sets email_confirmed_at.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple Google sign-up (you can unify it with handleRegisterWithEmail if you prefer)
  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // On success, supabase will redirect to /auth/callback
      // Then you can create the "registration" row after the callback, or automatically if you want
    } catch (err) {
      setErrorMsg(err.message);
      setIsLoading(false);
    }
  };

  // Render different forms for each step
  if (currentStep === 0) {
    // Step 0: Basic sign up
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 16 }}>
        <h1>Register (Step 1 of 3)</h1>
        {errorMsg && <div style={{ background: "#fee2e2" }}>{errorMsg}</div>}

        <button
          onClick={handleGoogleSignUp}
          disabled={isLoading}
          style={{ width: "100%", padding: 8, marginBottom: 16 }}
        >
          Sign Up With Google
        </button>

        <form onSubmit={handleRegisterWithEmail}>
          <div style={{ marginBottom: 8 }}>
            <label>Full Name</label>
            <input
              required
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Email</label>
            <input
              required
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Password</label>
            <input
              required
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ width: "100%", padding: "8px 16px", cursor: "pointer" }}
          >
            {isLoading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p style={{ marginTop: 16 }}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </div>
    );
  }

  if (currentStep === 1) {
    // Step 1: business details
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 16 }}>
        <h1>Business Details (Step 2 of 3)</h1>
        {errorMsg && <div style={{ background: "#fee2e2" }}>{errorMsg}</div>}

        <form onSubmit={handleBusinessNext}>
          <div style={{ marginBottom: 8 }}>
            <label>Organization Type</label>
            <select
              value={organizationType}
              onChange={(e) => setOrganizationType(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            >
              <option value="">-- Select One --</option>
              <option value="Individual">Individual</option>
              <option value="SMB">SMB</option>
              <option value="Startup">Startup</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Website Domain</label>
            <input
              placeholder="e.g. yoursite.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Business Description</label>
            <textarea
              placeholder="Brief summary..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Industry</label>
            <input
              placeholder="e.g. Software"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ width: "100%", padding: "8px 16px", cursor: "pointer" }}
          >
            {isLoading ? "Saving..." : "Next"}
          </button>
        </form>

        <button
          onClick={skipBusinessStep}
          style={{ width: "100%", padding: 8, marginTop: 16 }}
        >
          Skip This Step
        </button>
      </div>
    );
  }

  if (currentStep === 2) {
    // Step 2: final org details
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 16 }}>
        <h1>Organization Details (Step 3 of 3)</h1>
        {errorMsg && <div style={{ background: "#fee2e2" }}>{errorMsg}</div>}

        <form onSubmit={handleOrgSubmit}>
          <div style={{ marginBottom: 8 }}>
            <label>Entity Name</label>
            <input
              placeholder="My Company LLC"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Registration Type</label>
            <select
              value={registrationType}
              onChange={(e) => setRegistrationType(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            >
              <option value="">-- Select One --</option>
              <option value="LLC">LLC</option>
              <option value="Sole Proprietor">Sole Proprietor</option>
              <option value="Corporation">Corporation</option>
              <option value="Partnership">Partnership</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Jurisdiction</label>
            <input
              placeholder="e.g. Delaware, US"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Authorized Signatory</label>
            <div>
              <label style={{ marginRight: 8 }}>
                <input
                  type="radio"
                  value="me"
                  checked={authorizedSignatory === "me"}
                  onChange={(e) => setAuthorizedSignatory(e.target.value)}
                />
                Me
              </label>
              <label>
                <input
                  type="radio"
                  value="someone_else"
                  checked={authorizedSignatory === "someone_else"}
                  onChange={(e) => setAuthorizedSignatory(e.target.value)}
                />
                Someone Else
              </label>
            </div>
          </div>
          {authorizedSignatory === "someone_else" && (
            <div style={{ marginBottom: 8 }}>
              <label>Signatory Email</label>
              <input
                type="email"
                placeholder="signer@example.com"
                value={signatoryEmail}
                onChange={(e) => setSignatoryEmail(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{ width: "100%", padding: "8px 16px", cursor: "pointer" }}
          >
            {isLoading ? "Finalizing..." : "Complete Registration"}
          </button>
        </form>

        <button
          onClick={skipOrgStep}
          style={{ width: "100%", padding: 8, marginTop: 16 }}
        >
          Skip This Step
        </button>
      </div>
    );
  }

  return null; // fallback
}
