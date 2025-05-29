import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define protected routes
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/admin(.*)',
  '/stations(.*)',
  '/api/stations(.*)',
  '/api/user(.*)',
  '/api/admin(.*)',
  '/api/analysis(.*)',
  '/api/stripe(.*)',      // Payment/subscription routes
  '/api/saveTranscript',  // Transcript saving
  '/api/anam(.*)',        // AI session management
  '/api/protected(.*)',   // Protected folder
  '/api/video(.*)',       // Video access
])

export default clerkMiddleware((auth, req) => {
  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    auth.protect({
      // Configure authorized parties for production security
      // This prevents CSRF attacks and subdomain cookie leaking
      authorizedParties: [
        'http://localhost:3000',             // Local development
        'https://oscehelp.com',              // Production domain
        'https://www.oscehelp.com',          // Production domain with www
        process.env.NEXT_PUBLIC_VERCEL_URL, // Vercel deployment URL
        process.env.VERCEL_URL,             // Vercel internal URL
      ].filter(Boolean) // Remove undefined values
    })
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
} 