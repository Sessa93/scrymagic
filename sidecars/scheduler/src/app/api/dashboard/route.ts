import { listJobs, listRuns } from "@/lib/jobs-repo";
import { startScheduler } from "@/lib/scheduler-engine";

export async function GET() {
  startScheduler();
  const [jobs, runs] = await Promise.all([listJobs(), listRuns(200)]);
  return Response.json({ jobs, runs });
}
