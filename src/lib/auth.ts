import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, resetRateLimit } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12 hours
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or IUB ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const rl = checkRateLimit(`login:${credentials.identifier.toLowerCase()}`);
        if (!rl.allowed) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const identifier = credentials.identifier.trim();

        // Try admin (email) first, then student (loginId = IUB ID or Reg Number)
        const user = await prisma.user.findFirst({
          where: {
            isActive: true,
            OR: [
              { email: { equals: identifier, mode: "insensitive" } },
              { loginId: { equals: identifier, mode: "insensitive" } },
            ],
          },
          include: { student: true },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        resetRateLimit(`login:${credentials.identifier.toLowerCase()}`);

        return {
          id: user.id,
          role: user.role,
          name: user.student?.fullName ?? "Class Representative",
          email: user.email ?? user.loginId ?? "",
          studentId: user.studentId ?? undefined,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.studentId = (user as any).studentId;
        token.uid = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).studentId = token.studentId;
        (session.user as any).id = token.uid;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
