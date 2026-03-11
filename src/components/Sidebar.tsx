"use client";

import type { ScryfallSet } from "@/lib/scryfall";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SidebarProps {
  sets: ScryfallSet[];
  selectedSet?: string;
}

export default function Sidebar({ sets, selectedSet }: SidebarProps) {
  // User preference for open state (desktop). Small screens auto-collapse.
  const [openPref, setOpenPref] = useState(true);
  const [isSmall, setIsSmall] = useState(false);
  const [filter, setFilter] = useState("");
  const listRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [focusIdx, setFocusIdx] = useState<number>(-1);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const asideRef = useRef<HTMLElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [pageStep, setPageStep] = useState<number>(10);

  // Load preference and initialize responsive state
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-open");
      if (stored !== null) setOpenPref(stored === "true");
      const storedFilter = localStorage.getItem("sidebar-set-filter");
      if (storedFilter !== null) setFilter(storedFilter);
    } catch {}

    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsSmall(e.matches);
    const update = () => setIsSmall(mq.matches);
    update();
    mq.addEventListener?.("change", onChange);
    // Safari/older browsers fallback
    if (typeof mq.addListener === "function") {
      mq.addListener(onChange);
    }
    return () => {
      mq.removeEventListener?.("change", onChange);
      if (typeof mq.removeListener === "function") {
        mq.removeListener(onChange);
      }
    };
  }, []);

  // Persist preference changes
  useEffect(() => {
    try {
      localStorage.setItem("sidebar-open", String(openPref));
    } catch {}
  }, [openPref]);

  // Persist filter with a small debounce
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem("sidebar-set-filter", filter);
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [filter]);

  // Prefer URL search param over local storage when present and keep URL in sync
  useEffect(() => {
    const fromUrl = searchParams.get("setFilter");
    if (fromUrl !== null && fromUrl !== filter) {
      setFilter(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounce URL updates when filter changes (avoid history spam)
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (filter) {
        params.set("setFilter", filter);
      } else {
        params.delete("setFilter");
      }
      const qs = params.toString();
      const currentQs = searchParams.toString();
      if (qs === currentQs) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
    // Include dependencies that affect URL building
  }, [filter, pathname, router, searchParams]);

  // Global keyboard shortcut: 's' to toggle when not typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (isTyping) return;
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        setOpenPref((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Effective open state considers small screens
  const open = !isSmall && openPref;

  // Build set hierarchy: organize sets by parent
  const setHierarchy = useMemo(() => {
    const byCode = new Map(sets.map((s) => [s.code, s]));
    const withParent = sets.filter(
      (s) => s.parent_set_code && byCode.has(s.parent_set_code),
    );
    const parentCodes = new Set(withParent.map((s) => s.parent_set_code));
    const parents = sets.filter(
      (s) => parentCodes.has(s.code) && !s.parent_set_code,
    );
    const orphans = sets.filter(
      (s) => !s.parent_set_code && !parentCodes.has(s.code),
    );

    return { parents, orphans, byCode };
  }, [sets]);

  // Filter sets by name or code
  const filteredSets = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
    );
  }, [filter, sets]);

  // Organize filtered sets into hierarchy structure
  const hierarchyDisplay = useMemo(() => {
    const filtered = new Set(filteredSets.map((s) => s.code));
    const groups: Array<{
      parent: ScryfallSet | null;
      children: ScryfallSet[];
    }> = [];

    // Add parent groups
    for (const parent of setHierarchy.parents) {
      if (filtered.has(parent.code)) {
        const children = sets
          .filter(
            (s) => s.parent_set_code === parent.code && filtered.has(s.code),
          )
          .sort((a, b) => {
            const dateA = a.released_at || "";
            const dateB = b.released_at || "";
            return dateB.localeCompare(dateA);
          });
        groups.push({ parent, children });
      } else {
        // Show parent if any child matches filter
        const children = sets
          .filter(
            (s) => s.parent_set_code === parent.code && filtered.has(s.code),
          )
          .sort((a, b) => {
            const dateA = a.released_at || "";
            const dateB = b.released_at || "";
            return dateB.localeCompare(dateA);
          });
        if (children.length > 0) {
          groups.push({ parent, children });
        }
      }
    }

    // Add orphan sets
    for (const orphan of setHierarchy.orphans) {
      if (filtered.has(orphan.code)) {
        groups.push({ parent: null, children: [orphan] });
      }
    }

    return groups;
  }, [filteredSets, setHierarchy, sets]);

  // Flattened list of all displayable sets for focus management
  const allDisplaySets = useMemo(() => {
    const result: ScryfallSet[] = [];
    for (const group of hierarchyDisplay) {
      result.push(...group.children);
    }
    return result;
  }, [hierarchyDisplay]);

  // Compact number formatter for tight badges
  const nfCompact = useMemo(
    () => new Intl.NumberFormat(undefined, { notation: "compact" }),
    [],
  );

  // Manage roving focus index based on selected set or first filtered item
  useEffect(() => {
    const idx = allDisplaySets.findIndex((s) => s.code === selectedSet);
    const nextIdx = idx >= 0 ? idx : allDisplaySets.length > 0 ? 0 : -1;
    setFocusIdx((prev) =>
      prev === -1 ? nextIdx : Math.min(prev, allDisplaySets.length - 1),
    );
  }, [allDisplaySets, selectedSet]);

  const setListRef = (el: HTMLAnchorElement | null, i: number) => {
    listRefs.current[i] = el;
  };

  const moveFocus = (i: number) => {
    const clamped =
      ((i % allDisplaySets.length) + allDisplaySets.length) %
      allDisplaySets.length;
    setFocusIdx(clamped);
    const el = listRefs.current[clamped];
    el?.focus();
  };

  const onItemKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (allDisplaySets.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveFocus(i + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(i - 1);
        break;
      case "Home":
        e.preventDefault();
        moveFocus(0);
        break;
      case "End":
        e.preventDefault();
        moveFocus(allDisplaySets.length - 1);
        break;
      case "PageDown":
        e.preventDefault();
        moveFocus(Math.min(i + pageStep, allDisplaySets.length - 1));
        break;
      case "PageUp":
        e.preventDefault();
        moveFocus(Math.max(i - pageStep, 0));
        break;
      case "ArrowRight":
        // Treat ArrowRight as activate when expanded
        if (open) {
          // Let the anchor handle navigation on Enter/Space; for ArrowRight, simulate click
          e.preventDefault();
          listRefs.current[i]?.click();
        }
        break;
      case " ": // Space doesn't activate anchors by default
        e.preventDefault();
        listRefs.current[i]?.click();
        break;
      default:
        break;
    }
  };

  // Recalculate page step (visible items) on resize/open/filter changes
  useEffect(() => {
    const recalc = () => {
      const aside = asideRef.current;
      const controls = controlsRef.current;
      const sample = listRefs.current.find(Boolean);
      const asideH = aside?.clientHeight ?? 0;
      const controlsH = controls?.getBoundingClientRect().height ?? 0;
      const available = Math.max(0, asideH - controlsH - 8); // small padding fudge
      const itemH = sample?.getBoundingClientRect().height ?? (open ? 36 : 32);
      const step = Math.max(3, Math.floor(available / Math.max(1, itemH)));
      setPageStep(step);
    };
    recalc();
    const onResize = () => recalc();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, filter, allDisplaySets.length]);

  return (
    <aside
      aria-label="Sets sidebar"
      className={`sticky top-16 h-[calc(100vh-57px)] overflow-y-auto border-r border-card-border bg-card-bg/95 backdrop-blur p-3 transition-[width] duration-300 ${
        open ? "w-72" : "w-16"
      }`}
      ref={asideRef}
    >
      <div ref={controlsRef}>
        <div
          className={`mb-3 flex items-center ${open ? "justify-between" : "justify-center"}`}
        >
          {open ? (
            <div className="flex items-center gap-2">
              {/* Deck/stack icon */}
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-accent"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M7.5 4.5 15 2.8a2 2 0 0 1 2.4 1.5l1.7 7.5a2 2 0 0 1-1.5 2.4l-7.5 1.7a2 2 0 0 1-2.4-1.5L6 6.9a2 2 0 0 1 1.5-2.4Z"
                  opacity=".25"
                />
                <path
                  fill="currentColor"
                  d="M5.6 8.6 13 6.9a2 2 0 0 1 2.4 1.5l1.7 7.5a2 2 0 0 1-1.5 2.4l-7.5 1.7A2 2 0 0 1 5.6 19L3.9 11.6A2 2 0 0 1 5.6 8.6Z"
                />
              </svg>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Sets
              </h2>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setOpenPref((v) => !v)}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
            className="rounded-md border border-card-border bg-surface p-1.5 text-muted hover:text-foreground hover:border-accent transition-colors"
          >
            {open ? (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        {open ? (
          <div className="mb-3">
            <label htmlFor="set-filter" className="sr-only">
              Filter sets
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-muted">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm8.7 12.3-3.2-3.2a8 8 0 1 0-1.4 1.4l3.2 3.2a1 1 0 0 0 1.4-1.4Z"
                  />
                </svg>
              </span>
              <input
                id="set-filter"
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter sets..."
                className="w-full rounded-md border border-card-border bg-surface pl-8 pr-2 py-1.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          </div>
        ) : null}
      </div>

      <ul className="space-y-1" role="list">
        {hierarchyDisplay.map((group) => (
          <li key={group.parent?.code || "orphans"} className="space-y-1">
            {/* Parent set header */}
            {group.parent && open ? (
              <Link
                href={`/set/${group.parent.code}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors border ${
                  selectedSet === group.parent.code
                    ? "text-accent border-accent/40 bg-accent/10"
                    : "text-muted/70 border-transparent hover:text-accent hover:bg-surface/60"
                }`}
                aria-current={
                  selectedSet === group.parent.code ? "page" : undefined
                }
              >
                <img
                  src={group.parent.icon_svg_uri}
                  alt=""
                  aria-hidden="true"
                  className="h-3.5 w-3.5 brightness-0 invert opacity-60"
                />
                {group.parent.name}
              </Link>
            ) : null}

            {/* Child sets */}
            {group.children.map((set, setIdx) => {
              const flatIdx = allDisplaySets.findIndex(
                (s) => s.code === set.code,
              );
              return (
                <div
                  key={set.code}
                  className={group.parent && open ? "pl-4" : ""}
                >
                  <Link
                    href={`/set/${set.code}`}
                    title={set.name}
                    className={`group relative flex items-center gap-3 rounded-lg ${
                      open ? "px-3 py-2" : "p-2 justify-center"
                    } text-sm font-medium transition-colors ${
                      selectedSet === set.code
                        ? "bg-accent/20 border border-accent/40 text-foreground"
                        : "text-foreground hover:bg-surface border border-transparent"
                    }`}
                    aria-current={selectedSet === set.code ? "page" : undefined}
                    onKeyDown={(e) => onItemKeyDown(e, flatIdx)}
                    tabIndex={focusIdx === flatIdx ? 0 : -1}
                    ref={(el) => setListRef(el, flatIdx)}
                  >
                    <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-md bg-surface ring-1 ring-inset ring-card-border">
                      <img
                        src={set.icon_svg_uri}
                        alt={set.name}
                        className="h-4 w-4 brightness-0 invert opacity-85 group-hover:opacity-100"
                      />
                      {!open ? (
                        <span
                          className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-sm bg-accent text-white px-1.5 h-4 min-w-4 text-[10px] font-semibold shadow"
                          aria-hidden="true"
                          title={`${set.card_count} cards`}
                        >
                          {nfCompact.format(set.card_count)}
                        </span>
                      ) : null}
                    </span>
                    {open ? (
                      <>
                        <span className="truncate flex-1">{set.name}</span>
                        <span
                          className={`ml-auto inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ${
                            selectedSet === set.code
                              ? "bg-accent text-white"
                              : "bg-surface text-muted ring-1 ring-inset ring-card-border"
                          }`}
                          aria-label={`${set.card_count} cards`}
                        >
                          {set.card_count.toLocaleString()}
                        </span>
                      </>
                    ) : null}
                  </Link>
                </div>
              );
            })}
          </li>
        ))}
      </ul>
    </aside>
  );
}
