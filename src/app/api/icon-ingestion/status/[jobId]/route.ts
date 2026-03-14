import { NextResponse } from "next/server";
import { iconIngestionJobs } from "@/lib/icon-ingestion-jobs";
import { requireAdmin } from "@/lib/authz";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { jobId } = await params;
  const entry = iconIngestionJobs.get(jobId);
  if (!entry) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({ jobId, ...entry });
}
