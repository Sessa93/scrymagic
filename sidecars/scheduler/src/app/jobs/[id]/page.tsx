"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import JobForm from "@/components/JobForm";
import RunHistogram from "@/components/RunHistogram";
import {
  Job,
  jobToFormState,
  JobFormState,
  Run,
  DEFAULT_FORM,
  formStateToPayload,
  toLocalDate,
} from "@/components/job-ui";

const RUNS_PAGE_SIZE = 20;

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = Number(params.id);

  const [job, setJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobFormState>(DEFAULT_FORM);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsPage, setRunsPage] = useState(1);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runSearchInput, setRunSearchInput] = useState("");
  const [runSearch, setRunSearch] = useState("");
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });
      const json = (await response.json()) as { error?: string; job?: Job };
      if (!response.ok || !json.job) {
        throw new Error(json.error ?? "Failed to load job details");
      }
      setJob(json.job);
      setForm(jobToFormState(json.job));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const loadRuns = useCallback(
    async (args?: { page?: number; search?: string }) => {
      const page = args?.page ?? runsPage;
      const search = args?.search ?? runSearch;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(RUNS_PAGE_SIZE),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `/api/jobs/${jobId}/runs?${params.toString()}`,
        {
          cache: "no-store",
        },
      );
      const json = (await response.json()) as {
        error?: string;
        runs?: Run[];
        total?: number;
        page?: number;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load job runs");
      }
      setRuns(json.runs ?? []);
      setRunsTotal(json.total ?? 0);
      setRunsPage(json.page ?? page);
    },
    [jobId, runSearch, runsPage],
  );

  useEffect(() => {
    void (async () => {
      await loadJob();
      await loadRuns({ page: 1 });
    })();

    const id = setInterval(() => {
      void (async () => {
        await loadJob();
        await loadRuns();
      })();
    }, 5000);

    return () => clearInterval(id);
  }, [loadJob, loadRuns]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(runsTotal / RUNS_PAGE_SIZE)),
    [runsTotal],
  );

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(formStateToPayload(form)),
    });

    const json = (await response.json()) as { error?: string; job?: Job };
    setSaving(false);

    if (!response.ok || !json.job) {
      setError(json.error ?? "Failed to save job");
      return;
    }

    setJob(json.job);
    setForm(jobToFormState(json.job));
    await loadRuns();
  }

  async function runNow() {
    setError(null);
    const response = await fetch(`/api/jobs/${jobId}/run`, { method: "POST" });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Failed to trigger job");
      return;
    }
    await loadJob();
    await loadRuns({ page: 1 });
  }

  async function toggleEnabled() {
    if (!job) return;
    setError(null);
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: !job.enabled }),
    });
    const json = (await response.json()) as { error?: string; job?: Job };
    if (!response.ok || !json.job) {
      setError(json.error ?? "Failed to update job state");
      return;
    }
    setJob(json.job);
    setForm(jobToFormState(json.job));
  }

  async function deleteCurrentJob() {
    const confirmed = window.confirm(
      `Delete job #${jobId}? This also removes its run history.`,
    );
    if (!confirmed) return;

    const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Failed to delete job");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function applyRunSearch() {
    setError(null);
    setRunSearch(runSearchInput.trim());
    try {
      await loadRuns({ page: 1, search: runSearchInput.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function clearRunSearch() {
    setError(null);
    setRunSearchInput("");
    setRunSearch("");
    try {
      await loadRuns({ page: 1, search: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function changeRunsPage(nextPage: number) {
    setError(null);
    try {
      await loadRuns({ page: nextPage });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="scheduler-eyebrow mb-2">Job Details</div>
          <h1 className="scheduler-title">{job?.name ?? `Job #${jobId}`}</h1>
          <p className="mt-3 text-[0.96rem] leading-6 text-slate-300">
            Configure this job, trigger runs, and inspect per-job execution
            history.
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

      <section className="mb-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <JobForm
          title={loading ? "Loading job..." : `Edit Job #${jobId}`}
          form={form}
          submitLabel={saving ? "Saving..." : "Save Changes"}
          onChange={setForm}
          onSubmit={submitForm}
          onCancel={() => {
            if (job) {
              setForm(jobToFormState(job));
            }
          }}
        />

        <section className="mtg-card">
          <h2 className="mb-4 text-xl font-bold">Job Summary</h2>
          <div className="space-y-2 text-sm text-slate-200">
            <div>
              Status:{" "}
              {job?.isRunning
                ? "running"
                : job?.enabled
                  ? "enabled"
                  : "disabled"}
            </div>
            <div>Next Run: {toLocalDate(job?.nextRunAt ?? null)}</div>
            <div>Last Run: {toLocalDate(job?.lastRunAt ?? null)}</div>
            <div>Timezone: {job?.timezone ?? "-"}</div>
            <div>Cron: {job?.cronExpression ?? "-"}</div>
            <div>Type: {job?.jobType ?? "-"}</div>
            <div>Last Error: {job?.lastError ?? "-"}</div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="scheduler-button scheduler-button-primary"
              onClick={() => void runNow()}
              disabled={job?.isRunning}
            >
              Run Now
            </button>
            <button
              type="button"
              className="scheduler-button scheduler-button-ghost"
              onClick={() => void toggleEnabled()}
            >
              {job?.enabled ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              className="scheduler-button scheduler-button-danger"
              onClick={() => void deleteCurrentJob()}
            >
              Delete Job
            </button>
          </div>
        </section>
      </section>

      <section className="mtg-card">
        <div className="mb-6">
          <h2 className="mb-4 text-xl font-bold">Run History</h2>
          <RunHistogram runs={runs} />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Detailed Run Log</h2>
          <button
            className="scheduler-button scheduler-button-ghost"
            onClick={() => void loadRuns({ page: 1 })}
            type="button"
          >
            Refresh Runs
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            className="min-w-[220px] rounded border border-slate-500/50 bg-slate-950/70 px-3 py-1 text-xs"
            placeholder="Search this job's runs"
            value={runSearchInput}
            onChange={(e) => setRunSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void applyRunSearch();
              }
            }}
          />
          <button
            type="button"
            className="rounded border border-slate-500/50 px-3 py-1 text-xs hover:bg-slate-800/40"
            onClick={() => void applyRunSearch()}
          >
            Search
          </button>
          <button
            type="button"
            className="rounded border border-slate-500/50 px-3 py-1 text-xs hover:bg-slate-800/40"
            onClick={() => void clearRunSearch()}
          >
            Clear
          </button>
          <span className="text-xs text-slate-400">
            {runSearch ? `query: ${runSearch}` : "no search filter"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-500/40 text-left text-xs uppercase text-slate-300">
                <th className="pb-2">Run</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Trigger</th>
                <th className="pb-2">Started</th>
                <th className="pb-2">Finished</th>
                <th className="pb-2">Message</th>
                <th className="pb-2 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-slate-700/40">
                  <td className="py-2 text-xs">#{run.id}</td>
                  <td
                    className={`py-2 text-xs ${
                      run.status === "completed"
                        ? "text-emerald-300"
                        : run.status === "running"
                          ? "text-amber-300"
                          : run.status === "cancelled"
                            ? "text-slate-300"
                            : "text-red-300"
                    }`}
                  >
                    {run.status}
                  </td>
                  <td className="py-2 text-xs">{run.trigger}</td>
                  <td className="py-2 text-xs">{toLocalDate(run.startedAt)}</td>
                  <td className="py-2 text-xs">
                    {toLocalDate(run.finishedAt)}
                  </td>
                  <td className="py-2 text-xs text-slate-300">
                    {run.message ??
                      (run.externalJobId
                        ? `external=${run.externalJobId}`
                        : "-")}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className="rounded border border-slate-500/50 px-2 py-1 text-xs hover:bg-slate-800/40"
                      onClick={() => setSelectedRun(run)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {runs.length === 0 ? (
                <tr>
                  <td className="py-5 text-center text-slate-400" colSpan={7}>
                    No runs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
          <span>Total runs: {runsTotal}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-slate-500/50 px-2 py-1 hover:bg-slate-800/40 disabled:opacity-40"
              disabled={runsPage <= 1}
              onClick={() => void changeRunsPage(runsPage - 1)}
            >
              Prev
            </button>
            <span>
              Page {runsPage} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded border border-slate-500/50 px-2 py-1 hover:bg-slate-800/40 disabled:opacity-40"
              disabled={runsPage >= totalPages}
              onClick={() => void changeRunsPage(runsPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedRun ? (
        <section className="mt-6 mtg-card border border-sky-500/40">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">Run #{selectedRun.id} Details</h3>
            <button
              type="button"
              className="rounded border border-slate-500/50 px-3 py-1 text-xs hover:bg-slate-800/40"
              onClick={() => setSelectedRun(null)}
            >
              Close
            </button>
          </div>
          <div className="mb-2 text-xs text-slate-300">
            <div>Status: {selectedRun.status}</div>
            <div>Trigger: {selectedRun.trigger}</div>
            <div>Started: {toLocalDate(selectedRun.startedAt)}</div>
            <div>Finished: {toLocalDate(selectedRun.finishedAt)}</div>
            <div>External Job ID: {selectedRun.externalJobId ?? "-"}</div>
            <div>Message: {selectedRun.message ?? "-"}</div>
          </div>
          <pre className="max-h-80 overflow-auto rounded border border-slate-500/40 bg-slate-950/70 p-3 text-xs text-slate-100">
            {JSON.stringify(selectedRun.details ?? {}, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
