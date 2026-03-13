import { createJob, listJobs } from "@/lib/jobs-repo";
import { startScheduler } from "@/lib/scheduler-engine";
import type { JobInput } from "@/lib/types";

export async function GET() {
  startScheduler();
  const jobs = await listJobs();
  return Response.json({ jobs });
}

export async function POST(request: Request) {
  startScheduler();
  const payload = (await request.json()) as Partial<JobInput>;

  if (!payload.name || !payload.cronExpression || !payload.jobType) {
    return Response.json(
      { error: "name, cronExpression and jobType are required" },
      { status: 400 },
    );
  }

  const created = await createJob({
    name: payload.name,
    enabled: payload.enabled ?? true,
    cronExpression: payload.cronExpression,
    timezone: payload.timezone ?? "UTC",
    jobType: payload.jobType,
    config: payload.config ?? {},
  });

  return Response.json({ job: created }, { status: 201 });
}
