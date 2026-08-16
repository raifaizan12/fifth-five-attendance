import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const isAdminArea = path.startsWith("/dashboard") ||
      path.startsWith("/students") ||
      path.startsWith("/subjects") ||
      path.startsWith("/teachers") ||
      path.startsWith("/attendance") ||
      path.startsWith("/reports") ||
      path.startsWith("/backup") ||
      path.startsWith("/settings") ||
      path.startsWith("/audit") ||
      path.startsWith("/api/students") ||
      path.startsWith("/api/subjects") ||
      path.startsWith("/api/teachers") ||
      path.startsWith("/api/attendance") ||
      path.startsWith("/api/reports") ||
      path.startsWith("/api/backup") ||
      path.startsWith("/api/settings") ||
      path.startsWith("/api/audit");

    const isStudentArea = path.startsWith("/portal");

    if (isAdminArea && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (isStudentArea && token?.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/students/:path*",
    "/subjects/:path*",
    "/teachers/:path*",
    "/attendance/:path*",
    "/reports/:path*",
    "/backup/:path*",
    "/settings/:path*",
    "/audit/:path*",
    "/portal/:path*",
    "/api/students/:path*",
    "/api/subjects/:path*",
    "/api/teachers/:path*",
    "/api/attendance/:path*",
    "/api/reports/:path*",
    "/api/backup/:path*",
    "/api/settings/:path*",
    "/api/audit/:path*",
  ],
};
