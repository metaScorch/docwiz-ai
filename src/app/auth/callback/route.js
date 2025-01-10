import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    // If no code, just go to sign in
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const supabase = createRouteHandlerClient({ cookies });

  // Exchange the code from the query params for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Now we have a session, check if email is confirmed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the user’s email is confirmed, go to dashboard
  if (user?.email_confirmed_at) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } else {
    // If not verified, go to verify page
    return NextResponse.redirect(
      new URL(
        `/verify-email?email=${encodeURIComponent(user?.email)}`,
        request.url
      )
    );
  }
}
