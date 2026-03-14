import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return session;
}
