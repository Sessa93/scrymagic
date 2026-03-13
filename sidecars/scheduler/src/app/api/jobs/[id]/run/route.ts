import { getJobById } from "@/lib/jobs-repo";
import { startScheduler, triggerJobNow } from "@/lib/scheduler-engine";

interface Context {
  params: Promise<{ id: string }>;
}

export async function POST(_: Request, context: Context) {
  startScheduler();
  const { id } = await context.params;

  const job = await getJobById(Number(id));
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  try {
    await triggerJobNow(Number(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 409 });
  }

  return Response.json({ ok: true });
}
