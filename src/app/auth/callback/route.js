import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });

    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);

    // Redirect to dashboard after successful confirmation
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If no code, redirect to sign-in
  return NextResponse.redirect(new URL("/sign-in", request.url));
}
