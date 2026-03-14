"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function HeaderMenuBar() {
  const pathname = usePathname();
  const { data, status } = useSession();

  if (status !== "authenticated" || !data?.user) {
    return null;
  }

  const wishlistActive = pathname.startsWith("/wishlist");

  return (
    <div className="sticky top-14 z-40 border-b border-card-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
        <Link
          href="/wishlist"
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            wishlistActive
              ? "border-accent/70 bg-accent/15 text-accent"
              : "border-input-border text-foreground hover:border-accent hover:text-accent"
          }`}
        >
          Wishlist
        </Link>
      </div>
    </div>
  );
}
