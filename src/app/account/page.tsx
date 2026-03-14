"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Profile = {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
};

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=%2Faccount");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    setLoading(true);
    fetch("/api/account/profile")
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          user?: Profile;
          error?: string;
        } | null;

        if (!response.ok || !payload?.user) {
          throw new Error(payload?.error ?? "Unable to load account details");
        }

        setProfile(payload.user);
        setUsername(payload.user.username ?? "");
        setName(payload.user.name ?? "");
      })
      .catch((requestError) => {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Unable to load account details";
        setError(message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, name }),
    });

    const payload = (await response.json().catch(() => null)) as {
      user?: Profile;
      error?: string;
      issues?: string[];
    } | null;

    setSaving(false);

    if (!response.ok || !payload?.user) {
      const issues = payload?.issues?.join(" ");
      setError(issues ?? payload?.error ?? "Unable to update profile");
      return;
    }

    setProfile(payload.user);
    setUsername(payload.user.username ?? "");
    setName(payload.user.name ?? "");
    setSuccess("Profile updated successfully.");
    router.refresh();
  }

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-sm text-muted">Loading account details...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Your Account</h1>
      <p className="mb-8 text-sm text-muted">
        Logged in as{" "}
        {session?.user?.username ?? session?.user?.name ?? session?.user?.email}
      </p>

      <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xl">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
              maxLength={24}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="username"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Display name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              placeholder="Optional display name"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-muted">Email</span>
            <input
              value={profile?.email ?? ""}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-input-border/60 bg-input-bg/60 px-3 py-2 text-muted"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-card-border/70 bg-input-bg/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted">Role</p>
              <p className="text-sm">{profile?.role}</p>
            </div>
            <div className="rounded-lg border border-card-border/70 bg-input-bg/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted">
                Joined
              </p>
              <p className="text-sm">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : "-"}
              </p>
            </div>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-green-400">{success}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
