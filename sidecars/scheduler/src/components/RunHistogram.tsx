"use client";

import { Run } from "./job-ui";

export default function RunHistogram({ runs }: { runs: Run[] }) {
  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-slate-500/30 bg-slate-900/40 px-4 py-6 text-sm text-slate-400">
        No run history available.
      </div>
    );
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "bg-emerald-500";
      case "failed":
        return "bg-red-500";
      case "running":
        return "bg-amber-500";
      case "cancelled":
        return "bg-slate-500";
      default:
        return "bg-slate-600";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "completed":
        return "Success";
      case "failed":
        return "Failed";
      case "running":
        return "Running";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Show last 100 runs or all if fewer
  const displayRuns = runs.slice(0, 100);
  const successCount = runs.filter((r) => r.status === "completed").length;
  const failedCount = runs.filter((r) => r.status === "failed").length;
  const runningCount = runs.filter((r) => r.status === "running").length;
  const cancelledCount = runs.filter((r) => r.status === "cancelled").length;

  return (
    <div className="space-y-4 rounded-lg border border-slate-500/30 bg-slate-900/40 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-100">
          Run History Visualization
        </h3>
        <p className="text-xs text-slate-400">
          {displayRuns.length} runs shown
          {displayRuns.length < runs.length ? ` (of ${runs.length} total)` : ""}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded border border-emerald-500/40 bg-emerald-950/40 p-2">
          <div className="text-xs text-emerald-300">Completed</div>
          <div className="text-lg font-bold text-emerald-400">
            {successCount}
          </div>
        </div>
        <div className="rounded border border-red-500/40 bg-red-950/40 p-2">
          <div className="text-xs text-red-300">Failed</div>
          <div className="text-lg font-bold text-red-400">{failedCount}</div>
        </div>
        <div className="rounded border border-amber-500/40 bg-amber-950/40 p-2">
          <div className="text-xs text-amber-300">Running</div>
          <div className="text-lg font-bold text-amber-400">{runningCount}</div>
        </div>
        <div className="rounded border border-slate-500/40 bg-slate-950/40 p-2">
          <div className="text-xs text-slate-300">Cancelled</div>
          <div className="text-lg font-bold text-slate-400">
            {cancelledCount}
          </div>
        </div>
      </div>

      {/* Histogram */}
      <div className="overflow-x-auto rounded border border-slate-600/30 bg-slate-950/50 p-3">
        <div
          className="flex items-end justify-start gap-1 pb-2"
          style={{ minHeight: "120px" }}
        >
          {displayRuns.map((run) => (
            <div
              key={run.id}
              className={`group relative flex-1 rounded-t transition-all hover:opacity-80`}
              title={`Run #${run.id}: ${getStatusLabel(run.status)}`}
            >
              <div
                className={`${getStatusColor(run.status)} h-full rounded-t`}
                style={{ minHeight: "40px", minWidth: "3px" }}
              />
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 opacity-0 transition-opacity group-hover:opacity-100">
                #{run.id}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-400">
          Each bar represents one run. Green = success, Red = failed, Amber =
          running, Gray = cancelled.
        </div>
      </div>
    </div>
  );
}
