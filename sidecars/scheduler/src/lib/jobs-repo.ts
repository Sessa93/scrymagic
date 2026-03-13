import { getNextRunAt, validateCronExpression } from "@/lib/cron";
import { getPool } from "@/lib/db";
import type { JobInput, JobRun, SchedulerJob } from "@/lib/types";

let initialized = false;

export interface ListRunsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  jobId?: number;
}

export interface ListRunsResult {
  runs: JobRun[];
  total: number;
  page: number;
  pageSize: number;
}

function mapJob(row: Record<string, unknown>): SchedulerJob {
  return {
    id: Number(row.id),
    name: String(row.name),
    enabled: Boolean(row.enabled),
    cronExpression: String(row.cron_expression),
    timezone: String(row.timezone),
    jobType: String(row.job_type) as SchedulerJob["jobType"],
    config: (row.config as SchedulerJob["config"]) ?? {},
    nextRunAt: row.next_run_at ? String(row.next_run_at) : null,
    lastRunAt: row.last_run_at ? String(row.last_run_at) : null,
    isRunning: Boolean(row.is_running),
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapRun(row: Record<string, unknown>): JobRun {
  return {
    id: Number(row.id),
    jobId: Number(row.job_id),
    trigger: String(row.trigger) as JobRun["trigger"],
    status: String(row.status) as JobRun["status"],
    startedAt: String(row.started_at),
    finishedAt: row.finished_at ? String(row.finished_at) : null,
    externalJobId: row.external_job_id ? String(row.external_job_id) : null,
    message: row.message ? String(row.message) : null,
    details: (row.details as Record<string, unknown> | null) ?? null,
  };
}

export async function ensureSchema(): Promise<void> {
  if (initialized) return;

  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduler_jobs (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      cron_expression TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      job_type TEXT NOT NULL,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      next_run_at TIMESTAMPTZ,
      last_run_at TIMESTAMPTZ,
      is_running BOOLEAN NOT NULL DEFAULT FALSE,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduler_job_runs (
      id BIGSERIAL PRIMARY KEY,
      job_id BIGINT NOT NULL REFERENCES scheduler_jobs(id) ON DELETE CASCADE,
      trigger TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      external_job_id TEXT,
      message TEXT,
      details JSONB
    )
  `);

  initialized = true;
}

export async function listJobs(): Promise<SchedulerJob[]> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT * FROM scheduler_jobs ORDER BY created_at DESC`,
  );
  return rows.map((row) => mapJob(row));
}

export async function listRuns(limit = 100, jobId?: number): Promise<JobRun[]> {
  await ensureSchema();
  const { rows } = jobId
    ? await getPool().query(
        `
          SELECT *
          FROM scheduler_job_runs
          WHERE job_id = $2
          ORDER BY started_at DESC
          LIMIT $1
        `,
        [limit, jobId],
      )
    : await getPool().query(
        `SELECT * FROM scheduler_job_runs ORDER BY started_at DESC LIMIT $1`,
        [limit],
      );
  return rows.map((row) => mapRun(row));
}

export async function listRunsPaginated(
  query: ListRunsQuery,
): Promise<ListRunsResult> {
  await ensureSchema();

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (query.jobId !== undefined) {
    params.push(query.jobId);
    whereClauses.push(`r.job_id = $${params.length}`);
  }

  const search = query.search?.trim();
  if (search) {
    params.push(`%${search}%`);
    const searchParam = `$${params.length}`;
    whereClauses.push(`(
      CAST(r.id AS TEXT) ILIKE ${searchParam}
      OR CAST(r.job_id AS TEXT) ILIKE ${searchParam}
      OR r.status ILIKE ${searchParam}
      OR r.trigger ILIKE ${searchParam}
      OR COALESCE(r.message, '') ILIKE ${searchParam}
      OR COALESCE(r.external_job_id, '') ILIKE ${searchParam}
      OR COALESCE(j.name, '') ILIKE ${searchParam}
    )`);
  }

  const where =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countResult = await getPool().query<{ count: string }>(
    `
      SELECT COUNT(*) AS count
      FROM scheduler_job_runs r
      LEFT JOIN scheduler_jobs j ON j.id = r.job_id
      ${where}
    `,
    params,
  );

  const total = Number(countResult.rows[0]?.count ?? 0);

  const rowsResult = await getPool().query(
    `
      SELECT r.*
      FROM scheduler_job_runs r
      LEFT JOIN scheduler_jobs j ON j.id = r.job_id
      ${where}
      ORDER BY r.started_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, pageSize, offset],
  );

  return {
    runs: rowsResult.rows.map((row) => mapRun(row)),
    total,
    page,
    pageSize,
  };
}

export async function createJob(input: JobInput): Promise<SchedulerJob> {
  await ensureSchema();
  validateCronExpression(input.cronExpression, input.timezone ?? "UTC");

  const timezone = input.timezone ?? "UTC";
  const nextRunAt = input.enabled
    ? getNextRunAt(input.cronExpression, timezone).toISOString()
    : null;

  const { rows } = await getPool().query(
    `
      INSERT INTO scheduler_jobs (
        name, enabled, cron_expression, timezone, job_type, config, next_run_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING *
    `,
    [
      input.name,
      input.enabled,
      input.cronExpression,
      timezone,
      input.jobType,
      JSON.stringify(input.config ?? {}),
      nextRunAt,
    ],
  );

  return mapJob(rows[0]);
}

export async function updateJob(
  jobId: number,
  patch: Partial<JobInput>,
): Promise<SchedulerJob | null> {
  await ensureSchema();
  const pool = getPool();

  const existingRes = await pool.query(
    `SELECT * FROM scheduler_jobs WHERE id = $1`,
    [jobId],
  );
  if (existingRes.rowCount === 0) return null;

  const existing = mapJob(existingRes.rows[0]);
  const next: JobInput = {
    name: patch.name ?? existing.name,
    enabled: patch.enabled ?? existing.enabled,
    cronExpression: patch.cronExpression ?? existing.cronExpression,
    timezone: patch.timezone ?? existing.timezone,
    jobType: patch.jobType ?? existing.jobType,
    config: patch.config ?? existing.config,
  };

  validateCronExpression(next.cronExpression, next.timezone ?? "UTC");

  const nextRunAt = next.enabled
    ? getNextRunAt(next.cronExpression, next.timezone ?? "UTC").toISOString()
    : null;

  const { rows } = await pool.query(
    `
      UPDATE scheduler_jobs
      SET
        name = $2,
        enabled = $3,
        cron_expression = $4,
        timezone = $5,
        job_type = $6,
        config = $7::jsonb,
        next_run_at = $8,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      jobId,
      next.name,
      next.enabled,
      next.cronExpression,
      next.timezone,
      next.jobType,
      JSON.stringify(next.config ?? {}),
      nextRunAt,
    ],
  );

  return mapJob(rows[0]);
}

export async function claimDueJobs(limit = 5): Promise<SchedulerJob[]> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `
      UPDATE scheduler_jobs
      SET is_running = TRUE, updated_at = NOW()
      WHERE id IN (
        SELECT id
        FROM scheduler_jobs
        WHERE enabled = TRUE
          AND is_running = FALSE
          AND next_run_at IS NOT NULL
          AND next_run_at <= NOW()
        ORDER BY next_run_at ASC
        LIMIT $1
      )
      RETURNING *
    `,
    [limit],
  );

  return rows.map((row) => mapJob(row));
}

export async function createRun(
  jobId: number,
  trigger: JobRun["trigger"],
): Promise<JobRun> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `
      INSERT INTO scheduler_job_runs (job_id, trigger, status)
      VALUES ($1, $2, 'running')
      RETURNING *
    `,
    [jobId, trigger],
  );

  return mapRun(rows[0]);
}

export async function completeRun(
  runId: number,
  status: JobRun["status"],
  message: string | null,
  externalJobId: string | null,
  details: Record<string, unknown> | null,
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
      UPDATE scheduler_job_runs
      SET
        status = $2,
        finished_at = NOW(),
        message = $3,
        external_job_id = $4,
        details = $5::jsonb
      WHERE id = $1
    `,
    [runId, status, message, externalJobId, JSON.stringify(details ?? null)],
  );
}

export async function releaseJobAfterRun(
  jobId: number,
  nextRunAt: string | null,
  status: JobRun["status"],
  errorMessage: string | null,
): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `
      UPDATE scheduler_jobs
      SET
        is_running = FALSE,
        last_run_at = NOW(),
        next_run_at = $2,
        last_error = CASE WHEN $3 = 'failed' THEN $4 ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1
    `,
    [jobId, nextRunAt, status, errorMessage],
  );
}

export async function getJobById(jobId: number): Promise<SchedulerJob | null> {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT * FROM scheduler_jobs WHERE id = $1`,
    [jobId],
  );
  return rows[0] ? mapJob(rows[0]) : null;
}

export async function deleteJob(jobId: number): Promise<boolean> {
  await ensureSchema();
  const result = await getPool().query(
    `DELETE FROM scheduler_jobs WHERE id = $1`,
    [jobId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function tryStartManualRun(jobId: number): Promise<boolean> {
  await ensureSchema();
  const result = await getPool().query(
    `
      UPDATE scheduler_jobs
      SET is_running = TRUE, updated_at = NOW()
      WHERE id = $1 AND is_running = FALSE
    `,
    [jobId],
  );
  return (result.rowCount ?? 0) > 0;
}
