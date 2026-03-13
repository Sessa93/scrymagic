import { NextResponse } from "next/server";
import { iconIngestionJobs } from "@/lib/icon-ingestion-jobs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const { jobId } = await params;
  const entry = iconIngestionJobs.get(jobId);
  if (!entry) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({ jobId, ...entry });
}
