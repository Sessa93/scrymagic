import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-6xl font-bold text-accent">404</h1>
      <p className="mb-6 text-lg text-muted">
        This card seems to have phased out of existence.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
