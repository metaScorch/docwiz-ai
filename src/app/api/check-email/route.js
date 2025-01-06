import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Use service role key for admin access
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request) {
  try {
    const { email } = await request.json();

    // Check if the email exists in auth.users
    const { data: user, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error checking user:", userError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    const existingUser = user.users.find((u) => u.email === email);

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Email available" });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
