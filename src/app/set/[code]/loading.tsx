import LoadingSpinner from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center gap-2 px-4 text-center">
      <LoadingSpinner />
      <p className="text-sm text-muted">Loading cards for this set...</p>
    </div>
  );
}
