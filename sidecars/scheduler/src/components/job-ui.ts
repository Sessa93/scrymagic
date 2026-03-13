export type Job = {
  id: number;
  name: string;
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  jobType: "recommender_scryfall_ingest" | "ingest_set_icons";
  config: { limit?: number; batchSize?: number; workerCount?: number };
  nextRunAt: string | null;
  lastRunAt: string | null;
  isRunning: boolean;
  lastError: string | null;
};

export type Run = {
  id: number;
  jobId: number;
  trigger: "scheduled" | "manual";
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  finishedAt: string | null;
  externalJobId: string | null;
  message: string | null;
  details: Record<string, unknown> | null;
};

export type JobFormState = {
  name: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  jobType: "recommender_scryfall_ingest" | "ingest_set_icons";
  limit: string;
  batchSize: string;
  workerCount: string;
};

export const DEFAULT_FORM: JobFormState = {
  name: "Scryfall Ingest",
  cronExpression: "0 * * * *",
  timezone: "UTC",
  enabled: true,
  jobType: "recommender_scryfall_ingest",
  limit: "",
  batchSize: "256",
  workerCount: "4",
};

export function toLocalDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function jobToFormState(job: Job): JobFormState {
  return {
    name: job.name,
    cronExpression: job.cronExpression,
    timezone: job.timezone,
    enabled: job.enabled,
    jobType: job.jobType,
    limit: job.config.limit?.toString() ?? "",
    batchSize: job.config.batchSize?.toString() ?? "",
    workerCount: job.config.workerCount?.toString() ?? "",
  };
}

export function formStateToPayload(form: JobFormState) {
  return {
    name: form.name,
    enabled: form.enabled,
    cronExpression: form.cronExpression,
    timezone: form.timezone,
    jobType: form.jobType,
    config: {
      ...(form.limit ? { limit: Number(form.limit) } : {}),
      ...(form.batchSize ? { batchSize: Number(form.batchSize) } : {}),
      ...(form.workerCount ? { workerCount: Number(form.workerCount) } : {}),
    },
  };
}
