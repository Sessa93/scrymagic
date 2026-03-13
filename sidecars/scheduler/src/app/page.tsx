"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Job, Run, toLocalDate } from "@/components/job-ui";

const RUNS_PAGE_SIZE = 20;

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsPage, setRunsPage] = useState(1);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runSearchInput, setRunSearchInput] = useState("");
  const [runSearch, setRunSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const json = (await response.json()) as { jobs?: Job[]; error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load scheduled jobs");
      }
      setJobs(json.jobs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

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

      const response = await fetch(`/api/runs?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        runs?: Run[];
        total?: number;
        page?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load run history");
      }
      setRuns(json.runs ?? []);
      setRunsTotal(json.total ?? 0);
      setRunsPage(json.page ?? page);
    },
    [runSearch, runsPage],
  );

  useEffect(() => {
    void (async () => {
      await loadJobs();
      await loadRuns({ page: 1 });
    })();

    const id = setInterval(() => {
      void (async () => {
        await loadJobs();
        await loadRuns();
      })();
    }, 5000);

    return () => clearInterval(id);
  }, [loadJobs, loadRuns]);

  const jobsById = useMemo(
    () => new Map(jobs.map((job) => [job.id, job])),
    [jobs],
  );

  const totalPages = Math.max(1, Math.ceil(runsTotal / RUNS_PAGE_SIZE));

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
      <header className="mb-8">
        <div className="scheduler-eyebrow mb-2">Dashboard</div>
        <h1 className="scheduler-title">Scheduled Jobs and Global History</h1>
        <p className="mt-3 max-w-3xl text-[0.96rem] leading-6 text-slate-300">
          See all configured jobs at a glance and inspect the latest execution
          history. Select any job from the tables below to open its dedicated
          details page.
        </p>
      </header>

      {error ? (
        <div className="mb-6 rounded border border-red-500/50 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="mtg-card mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Scheduled Jobs</h2>
          <button
            className="scheduler-button scheduler-button-ghost"
            onClick={() => void loadJobs()}
            disabled={loading}
            type="button"
          >
            {loading ? "Refreshing..." : "Refresh Jobs"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-500/40 text-left text-xs uppercase text-slate-300">
                <th className="pb-2">Job</th>
                <th className="pb-2">Cron</th>
                <th className="pb-2">Next Run</th>
                <th className="pb-2">Last Run</th>
                <th className="pb-2">State</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-slate-700/40">
                  <td className="py-2 pr-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="scheduler-link font-semibold"
                    >
                      {job.name}
                    </Link>
                    <div className="text-xs text-slate-400">#{job.id}</div>
                  </td>
                  <td className="py-2 pr-2 text-xs">
                    <div>{job.cronExpression}</div>
                    <div className="text-slate-400">{job.timezone}</div>
                  </td>
                  <td className="py-2 pr-2 text-xs">
                    {toLocalDate(job.nextRunAt)}
                  </td>
                  <td className="py-2 pr-2 text-xs">
                    {toLocalDate(job.lastRunAt)}
                  </td>
                  <td className="py-2 pr-2 text-xs">
                    <span
                      className={
                        job.isRunning
                          ? "text-amber-300"
                          : job.enabled
                            ? "text-emerald-300"
                            : "text-slate-400"
                      }
                    >
                      {job.isRunning
                        ? "running"
                        : job.enabled
                          ? "enabled"
                          : "disabled"}
                    </span>
                    {job.lastError ? (
                      <div className="mt-1 text-red-300">{job.lastError}</div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {jobs.length === 0 ? (
                <tr>
                  <td className="py-5 text-center text-slate-400" colSpan={5}>
                    No jobs configured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mtg-card">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Run History for All Jobs</h2>
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
            placeholder="Search runs (status, job, message, external id...)"
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
            className="scheduler-button scheduler-button-ghost"
            onClick={() => void applyRunSearch()}
          >
            Search
          </button>
          <button
            type="button"
            className="scheduler-button scheduler-button-ghost"
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
                <th className="pb-2">Job</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Trigger</th>
                <th className="pb-2">Started</th>
                <th className="pb-2">Finished</th>
                <th className="pb-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const job = jobsById.get(run.jobId);
                return (
                  <tr key={run.id} className="border-b border-slate-700/40">
                    <td className="py-2 text-xs">#{run.id}</td>
                    <td className="py-2 text-xs">
                      <Link
                        href={`/jobs/${run.jobId}`}
                        className="scheduler-link font-semibold"
                      >
                        {job?.name ?? `Job #${run.jobId}`}
                      </Link>
                      <div className="text-slate-400">#{run.jobId}</div>
                    </td>
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
                    <td className="py-2 text-xs">
                      {toLocalDate(run.startedAt)}
                    </td>
                    <td className="py-2 text-xs">
                      {toLocalDate(run.finishedAt)}
                    </td>
                    <td className="py-2 text-xs text-slate-300">
                      {run.message ??
                        (run.externalJobId
                          ? `external=${run.externalJobId}`
                          : "-")}
                    </td>
                  </tr>
                );
              })}
              {runs.length === 0 ? (
                <tr>
                  <td className="py-5 text-center text-slate-400" colSpan={7}>
                    No runs found.
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
              className="border border-slate-500/50 px-2 py-1 hover:bg-slate-800/40 disabled:opacity-40"
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
              className="border border-slate-500/50 px-2 py-1 hover:bg-slate-800/40 disabled:opacity-40"
              disabled={runsPage >= totalPages}
              onClick={() => void changeRunsPage(runsPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
