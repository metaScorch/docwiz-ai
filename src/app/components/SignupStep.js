import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Image from "next/image";

export default function SignupStep({ onNext }) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Check if user exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select()
        .eq("email", email)
        .single();

      if (existingUser) {
        toast.error("An account with this email already exists");
        return;
      }

      // If user doesn't exist, proceed with signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (authError) throw authError;

      // Create registration entry
      const { data: registration, error: registrationError } = await supabase
        .from("registrations")
        .insert([
          {
            user_id: authData.user.id,
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (registrationError) throw registrationError;

      console.log("Registration created:", registration);
      console.log("Registration ID:", registration.id);

      onNext({ name, email, registrationId: registration.id });
      toast.success(
        "Signup successful! Please check your email to verify your account."
      );
    } catch (error) {
      toast.error(error.message || "Error during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center mb-6">
        <Image
          src="/logo.png"
          alt="DocWiz Logo"
          width={200}
          height={60}
          priority
        />
      </div>
      <h1 className="text-2xl font-semibold text-center mb-6">Signup</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Loading..." : "Sign Up with Email"}
        </Button>
      </form>
    </div>
  );
}
