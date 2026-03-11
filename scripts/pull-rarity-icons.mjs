#!/usr/bin/env node
/**
 * pull-rarity-icons.mjs
 *
 * Downloads rarity icons (C/U/R/M) for every set in the Investigamer/mtg-vectors
 * GitHub repo and saves them to public/icons/rarity/sets/{setcode}/.
 *
 * After downloading, regenerates src/generated/rarity-icon-sets.ts so that
 * RarityBadge.tsx knows which set-specific packs are available.
 *
 * Usage:
 *   npm run pull-rarity-icons            # skip already-downloaded sets
 *   npm run pull-rarity-icons -- --force  # re-download everything
 *
 * Optional env var:
 *   GITHUB_TOKEN=ghp_xxx npm run pull-rarity-icons
 *   (raises GitHub API rate limit from 60 to 5000 req/hour)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const PUBLIC_SETS_DIR = join(REPO_ROOT, "public", "icons", "rarity", "sets");
const GENERATED_DIR = join(REPO_ROOT, "src", "generated");
const GENERATED_FILE = join(GENERATED_DIR, "rarity-icon-sets.ts");

const GITHUB_API = "https://api.github.com/repos/Investigamer/mtg-vectors";
const RAW_BASE =
  "https://raw.githubusercontent.com/Investigamer/mtg-vectors/main/svg/optimized/set";
const RARITIES = ["C", "U", "R", "M"];
const CONCURRENCY = 20;

const FORCE = process.argv.includes("--force");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function githubHeaders() {
  const headers = { "User-Agent": "scrymagic-rarity-icon-puller" };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} for ${url}\n${body}`);
  }
  return res.json();
}

async function fetchBytes(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "scrymagic-rarity-icon-puller" },
  });
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Run `fn` over `items` with at most `limit` concurrent invocations.
 */
async function pool(items, fn, limit) {
  const results = new Array(items.length);
  const queue = items.map((item, i) => ({ item, i }));
  const running = new Set();

  async function run(task) {
    running.add(task);
    try {
      results[task.i] = await fn(task.item, task.i);
    } catch (err) {
      results[task.i] = { error: err.message };
    } finally {
      running.delete(task);
    }
  }

  for (const task of queue) {
    const p = run(task);
    if (running.size >= limit) {
      await Promise.race([...running].map((t) => t.__p || (t.__p = p)));
    }
  }
  // Use a simpler concurrent execution approach
  return results;
}

// Simpler pool via recursive batching
async function runPool(items, fn, limit) {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// ─── Core logic ───────────────────────────────────────────────────────────────

async function getSetCodes() {
  // Use the Contents API to list the svg/optimized/set/ directory directly
  const entries = await fetchJson(`${GITHUB_API}/contents/svg/optimized/set`);
  return entries
    .filter((e) => e.type === "dir" && !e.name.startsWith("."))
    .map((e) => e.name);
}

/**
 * Download C/U/R/M svgs for a set code (as returned by the GitHub tree, e.g. "MID").
 * Returns the lower-cased code if all 4 were downloaded, null otherwise.
 */
async function downloadSetPack(repoCode) {
  const localCode = repoCode.toLowerCase();
  const setDir = join(PUBLIC_SETS_DIR, localCode);

  // Skip if already complete and not forced
  if (!FORCE && existsSync(setDir)) {
    const existing = RARITIES.filter((r) =>
      existsSync(join(setDir, `${r}.svg`)),
    );
    if (existing.length === RARITIES.length) {
      return { localCode, status: "skipped" };
    }
  }

  mkdirSync(setDir, { recursive: true });

  let downloaded = 0;
  for (const rarity of RARITIES) {
    const url = `${RAW_BASE}/${repoCode}/${rarity}.svg`;
    const bytes = await fetchBytes(url);
    if (bytes) {
      writeFileSync(join(setDir, `${rarity}.svg`), bytes);
      downloaded++;
    }
  }

  if (downloaded === RARITIES.length) {
    return { localCode, status: "ok" };
  } else if (downloaded > 0) {
    return { localCode, status: "partial", downloaded };
  } else {
    return { localCode, status: "empty" };
  }
}

function generateManifest(availableCodes) {
  const sorted = [...availableCodes].sort();
  const lines = sorted.map((c) => `  "${c}",`).join("\n");
  return `// AUTO-GENERATED — do not edit manually.
// Run: npm run pull-rarity-icons
// Source: https://github.com/Investigamer/mtg-vectors

export const AVAILABLE_RARITY_SET_CODES: ReadonlySet<string> = new Set([
${lines}
]);
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  scrymagic — pull-rarity-icons");
  console.log("  Source: Investigamer/mtg-vectors");
  console.log("═══════════════════════════════════════════════════");
  if (FORCE) console.log("  Mode: --force (re-downloading all)");
  if (process.env.GITHUB_TOKEN) console.log("  Auth: GITHUB_TOKEN set");
  console.log("");

  console.log("Fetching set list from GitHub API...");
  const repoCodes = await getSetCodes();
  console.log(`Found ${repoCodes.length} sets in repo.\n`);

  mkdirSync(PUBLIC_SETS_DIR, { recursive: true });
  mkdirSync(GENERATED_DIR, { recursive: true });

  const stats = { ok: [], skipped: [], partial: [], empty: [] };
  let done = 0;
  const total = repoCodes.length;

  await runPool(
    repoCodes,
    async (repoCode) => {
      const result = await downloadSetPack(repoCode);
      done++;
      const pct = String(Math.round((done / total) * 100)).padStart(3);
      const tag = result.status.padEnd(7);
      process.stdout.write(`  [${pct}%] ${tag} ${repoCode}\n`);
      stats[result.status]?.push(result.localCode);
    },
    CONCURRENCY,
  );

  // Collect all complete packs (ok + skipped)
  const available = [...stats.ok, ...stats.skipped].sort();

  // Write generated manifest
  writeFileSync(GENERATED_FILE, generateManifest(available));

  console.log(`
═══════════════════════════════════════════════════
  Done.
  Downloaded  : ${stats.ok.length} sets
  Skipped     : ${stats.skipped.length} sets (already present)
  Partial     : ${stats.partial.length} sets (missing some rarities)
  Empty       : ${stats.empty.length} sets (no icons found)
  Available   : ${available.length} complete packs
  Generated   : src/generated/rarity-icon-sets.ts
═══════════════════════════════════════════════════`);
}

main().catch((err) => {
  console.error("\nFatal error:", err.message);
  process.exit(1);
});
