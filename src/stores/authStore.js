import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { posthog } from "@/lib/posthog";

const supabase = createClientComponentClient();

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      registrationData: null,
      currentStep: 0,
      isLoading: false,
      error: null,

      // Basic State Setters
      setLoading: (isLoading) => set({ isLoading }),
      setUser: (user) => set({ user }),
      setError: (error) => set({ error }),
      setCurrentStep: (step) => set({ currentStep: step }),

      // Reset Store
      reset: () =>
        set({
          user: null,
          registrationData: null,
          currentStep: 0,
          error: null,
        }),

      // Update Registration Data
      updateRegistrationData: (data) =>
        set((state) => ({
          registrationData: {
            ...state.registrationData,
            ...data,
          },
        })),

      // Email Sign Up
      signUpWithEmail: async (email, password, fullName) => {
        try {
          set({ isLoading: true, error: null });

          // Check if email exists
          const emailCheckResponse = await fetch("/api/check-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          if (!emailCheckResponse.ok) {
            const data = await emailCheckResponse.json();
            throw new Error(data.error || "Email already registered");
          }

          const redirectTo = `${window.location.origin}/auth/callback`;
          console.log("Redirect URL:", redirectTo);

          // Signup with Supabase
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
              emailRedirectTo: redirectTo,
            },
          });

          if (error) throw error;

          // Track successful signup
          posthog.capture("user_signup_email", {
            success: true,
            email_domain: email.split("@")[1],
          });

          // Update store state
          set({
            user: data.user,
            registrationData: {
              email,
              fullName,
              userId: data.user.id,
            },
            currentStep: 1,
            error: null,
          });

          toast.success("Please check your email to verify your account");
          return data;
        } catch (error) {
          set({ error: error.message });
          toast.error(error.message);

          // Track failed signup
          posthog.capture("user_signup_email", {
            success: false,
            error: error.message,
          });

          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Google OAuth Sign Up/Sign In
      signUpWithGoogle: async () => {
        try {
          set({ isLoading: true, error: null });

          const redirectTo = `${window.location.origin}/auth/callback`;
          console.log("Google OAuth Redirect URL:", redirectTo);

          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo,
              queryParams: {
                access_type: "offline",
                prompt: "consent",
              },
            },
          });

          if (error) throw error;

          // Track Google signup attempt
          posthog.capture("user_signup_google", {
            success: true,
          });

          return data;
        } catch (error) {
          set({ error: error.message });
          toast.error(error.message);

          // Track failed Google signup
          posthog.capture("user_signup_google", {
            success: false,
            error: error.message,
          });

          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Email Sign In
      signInWithEmail: async (email, password) => {
        try {
          set({ isLoading: true, error: null });

          // Check if email is verified
          const { data: userData, error: userError } = await supabase
            .from("auth.users")
            .select("email_confirmed_at")
            .eq("email", email)
            .single();

          if (!userData?.email_confirmed_at) {
            // If email isn't verified, resend verification email
            const { error: resendError } = await supabase.auth.resend({
              type: "signup",
              email,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
              },
            });

            if (resendError) throw resendError;

            set({ user: { email, needsVerification: true } });
            return { needsVerification: true };
          }

          // If email is verified, proceed with login
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          // Track successful login
          posthog.capture("user_login_email", {
            success: true,
            email_domain: email.split("@")[1],
          });

          set({ user: data.user });
          return data;
        } catch (error) {
          set({ error: error.message });
          toast.error(error.message);

          // Track failed login
          posthog.capture("user_login_email", {
            success: false,
            error: error.message,
          });

          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Magic Link Sign In
      signInWithMagicLink: async (email) => {
        try {
          set({ isLoading: true, error: null });

          const redirectTo = `${window.location.origin}/auth/callback`;
          console.log("Magic Link Redirect URL:", redirectTo);

          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
              shouldCreateUser: false, // Only allow existing users
            },
          });

          if (error) throw error;

          // Track magic link request
          posthog.capture("magic_link_requested", {
            email_domain: email.split("@")[1],
          });

          toast.success("Magic link sent to your email!");
        } catch (error) {
          set({ error: error.message });
          toast.error(error.message);

          // Track failed magic link request
          posthog.capture("magic_link_failed", {
            error: error.message,
          });

          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Sign Out
      signOut: async () => {
        try {
          set({ isLoading: true });
          const { error } = await supabase.auth.signOut();
          if (error) throw error;

          get().reset();

          // Track successful logout
          posthog.capture("user_logout", { success: true });
        } catch (error) {
          toast.error("Error signing out");

          // Track failed logout
          posthog.capture("user_logout", {
            success: false,
            error: error.message,
          });

          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Check Session
      checkSession: async () => {
        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();
          if (error) throw error;

          if (session?.user) {
            set({ user: session.user });
            return session;
          }

          return null;
        } catch (error) {
          console.error("Session check error:", error);
          return null;
        }
      },

      // Verify Email Status
      checkEmailVerification: async () => {
        try {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();
          if (error) throw error;

          return user?.email_confirmed_at ? true : false;
        } catch (error) {
          console.error("Email verification check error:", error);
          return false;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        registrationData: state.registrationData,
        currentStep: state.currentStep,
      }),
    }
  )
);

export default useAuthStore;
