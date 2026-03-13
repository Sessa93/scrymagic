"use client";

import { FormEvent } from "react";
import { JobFormState } from "@/components/job-ui";

type JobFormProps = {
  title: string;
  form: JobFormState;
  submitLabel: string;
  onChange: (next: JobFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCancel?: () => void;
};

export default function JobForm({
  title,
  form,
  submitLabel,
  onChange,
  onSubmit,
  onCancel,
}: JobFormProps) {
  return (
    <section className="mtg-card">
      <h2 className="mb-4 text-xl font-black tracking-[0.08em] uppercase">
        {title}
      </h2>
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
        <label className="block text-xs uppercase text-slate-300">
          Name
          <input
            className="mt-1 w-full rounded border border-slate-500/50 bg-slate-950/70 px-3 py-2"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            required
          />
        </label>

        <label className="block text-xs uppercase text-slate-300">
          Cron Expression
          <input
            className="mt-1 w-full rounded border border-slate-500/50 bg-slate-950/70 px-3 py-2"
            value={form.cronExpression}
            onChange={(e) =>
              onChange({ ...form, cronExpression: e.target.value })
            }
            required
          />
        </label>

        <label className="block text-xs uppercase text-slate-300">
          Timezone
          <input
            className="mt-1 w-full rounded border border-slate-500/50 bg-slate-950/70 px-3 py-2"
            value={form.timezone}
            onChange={(e) => onChange({ ...form, timezone: e.target.value })}
          />
        </label>

        <label className="block text-xs uppercase text-slate-300">
          Job Type
          <select
            className="mt-1 w-full rounded border border-slate-500/50 bg-slate-950/70 px-3 py-2"
            value={form.jobType}
            onChange={(e) =>
              onChange({
                ...form,
                jobType: e.target.value as
                  | "recommender_scryfall_ingest"
                  | "ingest_set_icons",
              })
            }
          >
            <option value="recommender_scryfall_ingest">
              Recommender — Scryfall Ingest
            </option>
            <option value="ingest_set_icons">Set Icon Ingestion</option>
          </select>
        </label>

        {form.jobType === "recommender_scryfall_ingest" && (
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-xs uppercase text-slate-300">
              Limit
              <input
                type="number"
                className="mt-1 w-full rounded border border-slate-500/50 bg-slate-950/70 px-3 py-2"
                value={form.limit}
                onChange={(e) => onChange({ ...form, limit: e.target.value })}
              />
            </label>
            <label className="block text-xs uppercase text-slate-300">
              Batch
              <input
                type="number"
                className="mt-1 w-full rounded border border-slate-500/50 bg-slate-950/70 px-3 py-2"
                value={form.batchSize}
                onChange={(e) =>
                  onChange({ ...form, batchSize: e.target.value })
                }
              />
            </label>
            <label className="block text-xs uppercase text-slate-300">
              Workers
              <input
                type="number"
                className="mt-1 w-full rounded border border-slate-500/50 bg-slate-950/70 px-3 py-2"
                value={form.workerCount}
                onChange={(e) =>
                  onChange({ ...form, workerCount: e.target.value })
                }
              />
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => onChange({ ...form, enabled: e.target.checked })}
          />
          Enabled
        </label>

        <div className="flex gap-2">
          <button
            className="scheduler-button scheduler-button-primary"
            type="submit"
          >
            {submitLabel}
          </button>
          {onCancel ? (
            <button
              type="button"
              className="scheduler-button scheduler-button-ghost"
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
