import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);

    // After exchanging the code, check if this was an email verification
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.email_confirmed_at) {
      // If email is verified, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // For other auth callbacks, redirect to the next URL
  return NextResponse.redirect(new URL(next, request.url));
}
