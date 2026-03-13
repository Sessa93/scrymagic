import { deleteJob, getJobById, updateJob } from "@/lib/jobs-repo";
import { startScheduler } from "@/lib/scheduler-engine";
import type { JobInput } from "@/lib/types";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: Context) {
  startScheduler();
  const { id } = await context.params;
  const job = await getJobById(Number(id));
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }
  return Response.json({ job });
}

export async function PATCH(request: Request, context: Context) {
  startScheduler();
  const { id } = await context.params;
  const patch = (await request.json()) as Partial<JobInput>;

  const updated = await updateJob(Number(id), patch);
  if (!updated) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  return Response.json({ job: updated });
}

export async function DELETE(_: Request, context: Context) {
  startScheduler();
  const { id } = await context.params;
  const deleted = await deleteJob(Number(id));
  if (!deleted) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
