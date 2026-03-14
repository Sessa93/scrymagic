"use client";

import { useEffect, useState } from "react";

export default function CardPageActionButtons({
  illustrationUrl,
  illustrationFileName,
  canDownloadIllustration,
}: {
  illustrationUrl: string | null;
  illustrationFileName: string;
  canDownloadIllustration: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copied]);

  async function handleShare() {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
      } catch {
        // Ignore browser share/copy failures; the page remains usable.
      }
    }
  }

  return (
    <div className="flex items-start gap-2">
      {canDownloadIllustration && illustrationUrl ? (
        <a
          href={illustrationUrl}
          download={illustrationFileName}
          title="Download illustration"
          aria-label="Download illustration"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-surface text-muted transition-all hover:border-accent/70 hover:bg-accent/10 hover:text-accent"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M12 3v11" />
            <path d="M8 10l4 4 4-4" />
            <path d="M5 20h14" />
          </svg>
        </a>
      ) : null}

      <button
        type="button"
        onClick={handleShare}
        title={copied ? "Link copied" : "Copy share link"}
        aria-label={copied ? "Link copied" : "Copy share link"}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
          copied
            ? "border-accent/70 bg-accent/15 text-accent"
            : "border-card-border bg-surface text-muted hover:border-accent/70 hover:bg-accent/10 hover:text-accent"
        }`}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M15 8a3 3 0 1 0-2.83-4" />
          <path d="M6 14a3 3 0 1 0 2.83 4" />
          <path d="M18 11a3 3 0 1 0 0 6" />
          <path d="M8.59 13.51l6.83 3.98" />
          <path d="M15.42 6.51L8.59 10.49" />
        </svg>
      </button>
    </div>
  );
}
