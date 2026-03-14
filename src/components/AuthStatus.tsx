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

  const userLabel =
    data.user.username ?? data.user.name ?? data.user.email ?? "your account";

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="text-sm text-muted">
        Logged in as{" "}
        <Link
          href="/account"
          className="font-semibold text-accent underline decoration-accent/60 underline-offset-4 transition-colors hover:text-accent-hover"
        >
          {userLabel}
        </Link>
      </span>
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
