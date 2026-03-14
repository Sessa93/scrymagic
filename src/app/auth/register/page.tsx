"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type RegistrationForm = {
  username: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegistrationForm>({
    username: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      issues?: string[];
    } | null;

    if (!response.ok) {
      const issueText = payload?.issues?.join(" ");
      setError(issueText ?? payload?.error ?? "Failed to create account.");
      setLoading(false);
      return;
    }

    const loginResult = await signIn("credentials", {
      usernameOrEmail: form.username,
      password: form.password,
      redirect: false,
      callbackUrl: "/",
    });

    setLoading(false);

    if (loginResult?.error) {
      router.push("/auth/signin");
      return;
    }

    router.push(loginResult?.url ?? "/");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-card-border bg-card-bg p-6 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold">Register</h1>
        <p className="mb-6 text-sm text-muted">
          Create an account to unlock protected features.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Username</span>
            <input
              required
              minLength={3}
              maxLength={24}
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="andrea"
              autoComplete="username"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="andrea@example.com"
              autoComplete="email"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="At least 8 chars with upper/lowercase and a number"
              autoComplete="new-password"
            />
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Already registered?{" "}
          <Link
            className="text-accent hover:text-accent-hover"
            href="/auth/signin"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
