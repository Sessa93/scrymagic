"use client";

import { useRouter } from "next/navigation";

export default function BackToResultsButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/");
      }}
      className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}
