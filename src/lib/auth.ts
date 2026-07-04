import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { enrichTokenWithMembership } from "./auth-token";
import { prisma } from "./prisma";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      try {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      } catch (error) {
        console.error("Credentials authorize error:", error);
        return null;
      }
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  // JWT sessions — no DB adapter (Credentials provider is incompatible with PrismaAdapter)
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.id = user.id;
        await enrichTokenWithMembership(token, user.id);
      } else if (token.id && !token.restaurantId) {
        await enrichTokenWithMembership(token, token.id as string);
      }
      if (trigger === "update" && session?.restaurantId && token.id) {
        await enrichTokenWithMembership(
          token,
          token.id as string,
          session.restaurantId as string
        );
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.restaurantId = token.restaurantId as string | undefined;
        session.user.role = token.role;
        session.user.restaurantName = token.restaurantName as
          | string
          | undefined;
        session.user.plan = token.plan;
        session.user.locale = token.locale as string | undefined;
        session.user.currency = token.currency as string | undefined;
        session.user.organizationId = token.organizationId as
          | string
          | null
          | undefined;
        session.user.country = token.country as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
