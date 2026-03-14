import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import path from "path";
import {
  iconIngestionJobs,
  activeIconIngestionJobId,
  setActiveIconIngestionJobId,
  type IconIngestionJob,
} from "@/lib/icon-ingestion-jobs";
import { requireAdmin } from "@/lib/authz";

export async function POST(): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (activeIconIngestionJobId) {
    const existing = iconIngestionJobs.get(activeIconIngestionJobId);
    if (existing?.status === "running") {
      return NextResponse.json(
        {
          error: "Icon ingestion is already running",
          jobId: activeIconIngestionJobId,
        },
        { status: 409 },
      );
    }
  }

  const jobId = randomUUID();
  const entry: IconIngestionJob = {
    status: "running",
    message: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  iconIngestionJobs.set(jobId, entry);
  setActiveIconIngestionJobId(jobId);

  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "pull-rarity-icons.mjs",
  );

  const child = spawn(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: process.env as NodeJS.ProcessEnv,
    stdio: "ignore",
  });

  child.on("close", (code) => {
    entry.finishedAt = new Date().toISOString();
    if (code === 0) {
      entry.status = "completed";
      entry.message = "Icon ingestion completed successfully";
    } else {
      entry.status = "failed";
      entry.message = `Icon ingestion exited with code ${String(code)}`;
    }
    if (activeIconIngestionJobId === jobId) setActiveIconIngestionJobId(null);
  });

  child.on("error", (err: Error) => {
    entry.finishedAt = new Date().toISOString();
    entry.status = "failed";
    entry.message = `Failed to start icon ingestion: ${err.message}`;
    if (activeIconIngestionJobId === jobId) setActiveIconIngestionJobId(null);
  });

  return NextResponse.json({ jobId });
}
