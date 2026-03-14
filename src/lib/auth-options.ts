import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import AzureADProvider from "next-auth/providers/azure-ad";
import { z } from "zod";
import { verify } from "argon2";
import { prisma } from "@/lib/prisma";
import {
  clearRateLimit,
  consumeRateLimit,
  extractClientIp,
} from "@/lib/rate-limit";

const credentialsSchema = z.object({
  usernameOrEmail: z.string().trim().min(1),
  password: z.string().min(1),
});

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Username / Email",
    credentials: {
      usernameOrEmail: {
        label: "Username or email",
        type: "text",
        placeholder: "andrea or andrea@example.com",
      },
      password: {
        label: "Password",
        type: "password",
      },
    },
    async authorize(rawCredentials, request) {
      const parsed = credentialsSchema.safeParse(rawCredentials);
      if (!parsed.success) {
        return null;
      }

      const identifier = parsed.data.usernameOrEmail;
      const ip = extractClientIp(
        request?.headers as Record<string, string | string[] | undefined>,
      );

      const [ipLimit, identifierLimit] = await Promise.all([
        consumeRateLimit({
          scope: "auth:login:ip",
          identifier: ip,
          limit: 15,
          windowSeconds: 600,
        }),
        consumeRateLimit({
          scope: "auth:login:identifier",
          identifier,
          limit: 10,
          windowSeconds: 600,
        }),
      ]);

      if (!ipLimit.allowed || !identifierLimit.allowed) {
        return null;
      }

      const user = await prisma.user.findFirst({
        where: identifier.includes("@")
          ? { email: identifier.toLowerCase() }
          : { username: identifier },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const passwordMatches = await verify(
        user.passwordHash,
        parsed.data.password,
      );
      if (!passwordMatches) {
        return null;
      }

      await Promise.all([
        clearRateLimit("auth:login:ip", ip),
        clearRateLimit("auth:login:identifier", identifier),
      ]);

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? user.username ?? undefined,
        username: user.username ?? undefined,
        image: user.image ?? undefined,
        role: user.role,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
  process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      tenantId: process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      if (user && "role" in user && typeof user.role === "string") {
        token.role = user.role;
      }

      if (user && "username" in user && typeof user.username === "string") {
        token.username = user.username;
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            username: true,
            name: true,
            email: true,
          },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.username = dbUser.username ?? undefined;
          token.name = dbUser.name ?? token.name;
          token.email = dbUser.email ?? token.email;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      if (session.user) {
        session.user.role =
          typeof token.role === "string" ? token.role : "USER";

        session.user.username =
          typeof token.username === "string" ? token.username : undefined;

        if (typeof token.name === "string") {
          session.user.name = token.name;
        }

        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
      }

      return session;
    },
  },
};
