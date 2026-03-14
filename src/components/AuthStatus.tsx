"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AuthStatus() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <div className="text-sm text-muted">Loading account...</div>;
  }

  if (!data?.user) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/auth/register"
          className="rounded-lg border border-input-border px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          Register
        </Link>
        <Link
          href="/auth/signin"
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const userLabel = data.user.name ?? data.user.email ?? "Signed in";

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="text-sm text-muted">{userLabel}</span>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-lg border border-input-border px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        Sign out
      </button>
    </div>
  );
}
