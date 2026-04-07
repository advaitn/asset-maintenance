import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  callbacks: {
    authorized({ request, auth }) {
      const path = request.nextUrl.pathname;
      if (path === "/" || path.startsWith("/api/auth")) return true;
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        (session.user as unknown as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "User ID or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const raw = (credentials?.username as string)?.trim();
        const password = credentials?.password as string;
        if (!raw || !password) return null;

        const account = await prisma.account.findFirst({
          where: {
            isActive: true,
            OR: [{ id: raw }, { email: { equals: raw, mode: "insensitive" } }],
          },
        });
        if (!account) return null;

        const valid = await bcrypt.compare(password, account.passwordHash);
        if (!valid) return null;

        await prisma.account.update({
          where: { id: account.id },
          data: { lastLoginDate: new Date() },
        });

        return {
          id: account.id,
          name: account.fullName,
          email: account.email,
          role: account.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
});
