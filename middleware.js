import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      // Always require authentication
      if (!token) return false;
      
      // For admin routes, check if user has admin role
      const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
      if (isAdminRoute) {
        return token.role === 'admin';
      }
      
      // Block access to station creation for non-admin users
      const isStationCreationRoute = req.nextUrl.pathname.includes('/stations/new') || 
                                    req.nextUrl.pathname.includes('/stations/create');
      if (isStationCreationRoute && token.role !== 'admin') {
        return false;
      }
      
      // Allow access to regular routes for authenticated users
      return true;
    },
    
    redirect({ url, baseUrl }) {
      // If accessing the root page and authenticated, redirect based on role
      if (url === `${baseUrl}/`) {
        // Extract token from session - this would need proper implementation
        return baseUrl + '/dashboard';
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

// Protect all routes under /dashboard and /api/protected and /admin
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/protected/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/stations/:path*",  // Add protection for station-related routes
  ],
}; 