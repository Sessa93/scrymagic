// Shared in-process job registry for icon ingestion tracking.
// Both /api/icon-ingestion/start and /api/icon-ingestion/status use this module.

export type IconIngestionJob = {
  status: "running" | "completed" | "failed";
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export const iconIngestionJobs = new Map<string, IconIngestionJob>();

export let activeIconIngestionJobId: string | null = null;

export function setActiveIconIngestionJobId(id: string | null): void {
  activeIconIngestionJobId = id;
}
