export type JobType = "recommender_scryfall_ingest";
export type RunStatus = "running" | "completed" | "failed" | "cancelled";

export interface JobConfig {
  limit?: number;
  batchSize?: number;
  workerCount?: number;
}

export interface SchedulerJob {
  id: number;
  name: string;
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  jobType: JobType;
  config: JobConfig;
  nextRunAt: string | null;
  lastRunAt: string | null;
  isRunning: boolean;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobRun {
  id: number;
  jobId: number;
  trigger: "scheduled" | "manual";
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  externalJobId: string | null;
  message: string | null;
  details: Record<string, unknown> | null;
}

export interface JobInput {
  name: string;
  enabled: boolean;
  cronExpression: string;
  timezone?: string;
  jobType: JobType;
  config: JobConfig;
}
