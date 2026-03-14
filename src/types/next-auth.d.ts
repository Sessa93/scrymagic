import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      username?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "USER" | "ADMIN";
    username?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "ADMIN";
    username?: string;
  }
}
