import { getJobById, listRunsPaginated } from "@/lib/jobs-repo";
import { startScheduler } from "@/lib/scheduler-engine";

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: Context) {
  startScheduler();

  const { id } = await context.params;
  const jobId = Number(id);

  const job = await getJobById(jobId);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const search = searchParams.get("search") ?? undefined;

  const result = await listRunsPaginated({
    page,
    pageSize,
    search,
    jobId,
  });

  return Response.json(result);
}
