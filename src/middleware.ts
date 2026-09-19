import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Pages/APIs only the CR/Admin may use
    const isAdminOnly =
      path.startsWith("/dashboard") ||
      path.startsWith("/students") ||
      path.startsWith("/subjects") ||
      path.startsWith("/teachers") ||
      path.startsWith("/attendance") ||
      path.startsWith("/reports") ||
      path.startsWith("/backup") ||
      path.startsWith("/audit") ||
      path.startsWith("/timetable") ||
      path.startsWith("/api/students") ||
      path.startsWith("/api/attendance/mark") ||
      path.startsWith("/api/attendance/roster") ||
      path.startsWith("/api/attendance/sessions") ||
      path.startsWith("/api/reports") ||
      path.startsWith("/api/backup") ||
      path.startsWith("/api/audit");

    // Pages only Students may use
    const isStudentOnly = path.startsWith("/portal");

    if (isAdminOnly && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (isStudentOnly && token?.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Everything else covered by the matcher below (settings, subjects/teachers GET,
    // attendance/history, api/timetable) is shared: any logged-in user may reach it,
    // and the individual API route itself enforces the correct per-role data scoping.
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
    "/timetable/:path*",
    "/portal/:path*",
    "/api/students/:path*",
    "/api/subjects/:path*",
    "/api/teachers/:path*",
    "/api/attendance/:path*",
    "/api/reports/:path*",
    "/api/backup/:path*",
    "/api/settings/:path*",
    "/api/audit/:path*",
    "/api/timetable/:path*",
  ],
};
