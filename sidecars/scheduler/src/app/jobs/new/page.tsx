"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import JobForm from "@/components/JobForm";
import { DEFAULT_FORM, formStateToPayload } from "@/components/job-ui";

export default function NewJobPage() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(formStateToPayload(form)),
    });

    const json = (await response.json()) as {
      error?: string;
      job?: { id: number };
    };
    setSaving(false);

    if (!response.ok) {
      setError(json.error ?? "Failed to create job");
      return;
    }

    router.push(`/jobs/${json.job?.id ?? ""}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="scheduler-eyebrow mb-2">Create Job</div>
          <h1 className="scheduler-title">Create Scheduled Job</h1>
          <p className="mt-3 text-[0.96rem] leading-6 text-slate-300">
            Configure a new cron-based job for the recommender ingest workflow.
          </p>
        </div>
        <Link href="/" className="scheduler-button scheduler-button-ghost">
          Back to Dashboard
        </Link>
      </div>

      {error ? (
        <div className="mb-6 rounded border border-red-500/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <JobForm
        title="New Scheduled Job"
        form={form}
        submitLabel={saving ? "Creating..." : "Create Job"}
        onChange={setForm}
        onSubmit={submitForm}
        onCancel={() => router.push("/")}
      />
    </div>
  );
}
