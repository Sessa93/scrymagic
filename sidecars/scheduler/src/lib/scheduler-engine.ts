import { getNextRunAt } from "@/lib/cron";
import {
  claimDueJobs,
  completeRun,
  createRun,
  getJobById,
  releaseJobAfterRun,
  tryStartManualRun,
} from "@/lib/jobs-repo";
import type { JobRun, SchedulerJob } from "@/lib/types";

const RECOMMENDER_BASE_URL =
  process.env.RECOMMENDER_API_BASE_URL ?? "http://127.0.0.1:3001";
const TICK_MS = Number(process.env.SCHEDULER_TICK_MS ?? 15000);
const POLL_MS = Number(process.env.RECOMMENDER_POLL_MS ?? 5000);
const MAX_POLL_MS = Number(
  process.env.RECOMMENDER_MAX_POLL_MS ?? 60 * 60 * 1000,
);

let started = false;

export function startScheduler(): void {
  if (started) return;
  started = true;

  setInterval(() => {
    void tickScheduler();
  }, TICK_MS);

  void tickScheduler();
}

export async function tickScheduler(): Promise<void> {
  const jobs = await claimDueJobs(3);
  for (const job of jobs) {
    void runClaimedJob(job, "scheduled");
  }
}

export async function triggerJobNow(jobId: number): Promise<void> {
  const claimed = await tryStartManualRun(jobId);
  if (!claimed) {
    throw new Error("Job is already running or does not exist");
  }

  const job = await getJobById(jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  void runClaimedJob(job, "manual");
}

async function runClaimedJob(
  job: SchedulerJob,
  trigger: JobRun["trigger"],
): Promise<void> {
  const run = await createRun(job.id, trigger);

  let resultStatus: JobRun["status"] = "completed";
  let message: string | null = null;
  let externalJobId: string | null = null;
  let details: Record<string, unknown> | null = null;

  try {
    const execution = await executeJob(job);
    resultStatus = execution.status;
    message = execution.message;
    externalJobId = execution.externalJobId ?? null;
    details = execution.details ?? null;
  } catch (error) {
    resultStatus = "failed";
    message = error instanceof Error ? error.message : String(error);
    details = { error: message };
  }

  await completeRun(run.id, resultStatus, message, externalJobId, details);

  const nextRunAt = job.enabled
    ? getNextRunAt(job.cronExpression, job.timezone).toISOString()
    : null;

  await releaseJobAfterRun(
    job.id,
    nextRunAt,
    resultStatus,
    resultStatus === "failed" ? message : null,
  );
}

async function executeJob(job: SchedulerJob): Promise<{
  status: JobRun["status"];
  message: string;
  externalJobId?: string;
  details?: Record<string, unknown>;
}> {
  if (job.jobType !== "recommender_scryfall_ingest") {
    throw new Error(`Unsupported job type: ${job.jobType}`);
  }

  const startResponse = await fetch(
    `${RECOMMENDER_BASE_URL}/api/recommender/ingest/scryfall/start`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(job.config ?? {}),
    },
  );

  if (!startResponse.ok) {
    const text = await startResponse.text();
    throw new Error(
      `Failed to start recommender ingestion (${startResponse.status}): ${text}`,
    );
  }

  const startBody = (await startResponse.json()) as {
    jobId: string;
    status?: Record<string, unknown>;
  };

  const externalJobId = startBody.jobId;
  if (!externalJobId) {
    throw new Error("Recommender ingestion start response missing jobId");
  }

  const pollStartedAt = Date.now();
  while (Date.now() - pollStartedAt < MAX_POLL_MS) {
    await sleep(POLL_MS);

    const statusResponse = await fetch(
      `${RECOMMENDER_BASE_URL}/api/recommender/ingest/scryfall/status/${externalJobId}`,
      { headers: { Accept: "application/json" } },
    );

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to poll recommender ingestion status (${statusResponse.status})`,
      );
    }

    const statusBody = (await statusResponse.json()) as {
      status: "running" | "completed" | "failed" | "cancelled";
      [key: string]: unknown;
    };

    if (statusBody.status === "running") {
      continue;
    }

    if (statusBody.status === "completed") {
      return {
        status: "completed",
        message: "Recommender ingestion completed",
        externalJobId,
        details: statusBody,
      };
    }

    if (statusBody.status === "cancelled") {
      return {
        status: "cancelled",
        message: "Recommender ingestion cancelled",
        externalJobId,
        details: statusBody,
      };
    }

    return {
      status: "failed",
      message: "Recommender ingestion failed",
      externalJobId,
      details: statusBody,
    };
  }

  throw new Error("Timed out waiting for recommender ingestion completion");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
