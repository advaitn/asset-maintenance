import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
});
