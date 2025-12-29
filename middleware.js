// middleware.js
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/stations(.*)",
  "/api/stations(.*)",
  "/api/user(.*)",
  "/api/admin(.*)",
  "/api/analysis(.*)",
  "/api/email(.*)",

  // ✅ Keep Stripe APIs protected EXCEPT the webhook (we exempt below)
  "/api/stripe(.*)",

  "/api/saveTranscript",
  "/api/anam(.*)",
  "/api/protected(.*)",
  "/api/video(.*)",
  "/api/heygen(.*)",
  "/api/openai-stream(.*)",

  "/api/assemblyai(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // ✅ Stripe webhooks must be PUBLIC (Stripe won't be signed into Clerk)
  if (pathname === "/api/stripe/webhook") {
    return NextResponse.next();
  }

  // ✅ Clerk middleware auth object (newer Clerk versions)
  const a = await auth();
  const isAuthed = a?.isAuthenticated === true || !!a?.userId; // support both shapes

  // ✅ Enforce auth on protected routes
  if (isProtectedRoute(req) && !isAuthed) {
    // For API calls, return JSON instead of redirecting to HTML
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Please sign in." },
        { status: 401 }
      );
    }

    // If Clerk provides redirectToSignIn, use it; otherwise fallback to /auth/signin
    if (typeof a?.redirectToSignIn === "function") {
      return a.redirectToSignIn({ returnBackUrl: req.url });
    }

    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ✅ Restricted user gating (fraud/abuse)
  // Try multiple claim paths (because claims shape depends on Clerk token config)
  const claims = a?.sessionClaims || {};
  const restricted =
    claims?.publicMetadata?.restricted === true ||
    claims?.unsafeMetadata?.restricted === true ||
    claims?.metadata?.restricted === true; // common custom-claim pattern

  if (restricted) {
    // Allow only these routes while restricted
    const allowed =
      pathname === "/restricted" ||
      pathname === "/support" ||
      pathname === "/api/user/subscription";

    if (!allowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "ACCOUNT_RESTRICTED",
            message:
              "Your account is restricted. Please contact support to continue.",
          },
          { status: 403 }
        );
      }

      const url = req.nextUrl.clone();
      url.pathname = "/restricted";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
