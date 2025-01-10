import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Get session
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Get the current URL path
  const path = req.nextUrl.pathname;

  // List of public paths that don't require authentication
  const publicPaths = ["/sign-in", "/register", "/verify-email"];
  const isPublicPath = publicPaths.includes(path);

  if (!session && path.startsWith("/dashboard")) {
    // Redirect to sign-in if trying to access protected route without session
    const redirectUrl = new URL("/sign-in", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (session?.user) {
    // Check if email is verified
    const isVerified = session.user.email_confirmed_at;

    if (!isVerified && !path.includes("/verify-email") && !isPublicPath) {
      // Redirect to verify-email if email isn't verified
      const redirectUrl = new URL(
        `/verify-email?email=${encodeURIComponent(session.user.email)}`,
        req.url
      );
      return NextResponse.redirect(redirectUrl);
    }

    if (isVerified && isPublicPath) {
      // Redirect to dashboard if user is verified and trying to access public paths
      const redirectUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico)$).*)",
  ],
};
