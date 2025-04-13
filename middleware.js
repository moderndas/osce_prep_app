import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

// Protect all routes under /dashboard and /api/protected
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/protected/:path*",
    "/profile/:path*",
  ],
}; 