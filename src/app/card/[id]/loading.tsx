import LoadingSpinner from "@/components/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
