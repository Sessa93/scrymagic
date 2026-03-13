import { listRunsPaginated } from "@/lib/jobs-repo";
import { startScheduler } from "@/lib/scheduler-engine";

export async function GET(request: Request) {
  startScheduler();

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");
  const search = searchParams.get("search") ?? undefined;

  const result = await listRunsPaginated({
    page,
    pageSize,
    search,
  });

  return Response.json(result);
}
