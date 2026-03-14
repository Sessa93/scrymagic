"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { getProviders, signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type CredentialsState = {
  usernameOrEmail: string;
  password: string;
};

const providerLabels: Record<string, string> = {
  google: "Continue with Google",
  apple: "Continue with Apple",
  "azure-ad": "Continue with Microsoft",
};

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [credentials, setCredentials] = useState<CredentialsState>({
    usernameOrEmail: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { status } = useSession();
  const [providers, setProviders] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    getProviders()
      .then((result) => {
        if (!result) {
          return;
        }

        const oauth = Object.values(result)
          .filter((provider) => provider.id !== "credentials")
          .map((provider) => ({ id: provider.id, name: provider.name }));
        setProviders(oauth);
      })
      .catch(() => {
        setProviders([]);
      });
  }, []);

  if (status === "authenticated") {
    router.replace(callbackUrl);
  }

  async function handleCredentialsSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      usernameOrEmail: credentials.usernameOrEmail,
      password: credentials.password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid username/email or password.");
      return;
    }

    router.push(result.url ?? callbackUrl);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-md items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-card-border bg-card-bg p-6 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold">Sign in</h1>
        <p className="mb-6 text-sm text-muted">
          Use your account credentials or an external provider.
        </p>

        <form className="space-y-4" onSubmit={handleCredentialsSignIn}>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Username or email</span>
            <input
              value={credentials.usernameOrEmail}
              onChange={(event) =>
                setCredentials((current) => ({
                  ...current,
                  usernameOrEmail: event.target.value,
                }))
              }
              autoComplete="username"
              required
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="andrea"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Password</span>
            <input
              type="password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="********"
            />
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Sign in with credentials"}
          </button>
        </form>

        <div className="my-5 h-px bg-card-border" />

        <div className="space-y-2">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => signIn(provider.id, { callbackUrl })}
              className="w-full rounded-lg border border-input-border px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {providerLabels[provider.id] ?? `Continue with ${provider.name}`}
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted">
          No account yet?{" "}
          <Link
            className="text-accent hover:text-accent-hover"
            href="/auth/register"
          >
            Register now
          </Link>
        </p>
      </div>
    </div>
  );
}
