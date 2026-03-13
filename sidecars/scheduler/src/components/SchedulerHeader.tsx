import Link from "next/link";

export default function SchedulerHeader() {
  return (
    <header className="border-b border-slate-700/50 bg-slate-950/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
        <div>
          <div className="scheduler-eyebrow mb-2">Sidecar Control Center</div>
          <Link
            href="/"
            className="scheduler-title scheduler-link block text-[1.6rem] whitespace-nowrap"
          >
            ScryMagic Scheduler
          </Link>
          <div className="mt-1 text-sm text-slate-400">
            Job control and execution history
          </div>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/" className="scheduler-button scheduler-button-ghost">
            Dashboard
          </Link>
          <Link
            href="/jobs/new"
            className="scheduler-button scheduler-button-primary"
          >
            New Job
          </Link>
        </nav>
      </div>
    </header>
  );
}
