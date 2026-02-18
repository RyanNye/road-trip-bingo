/**
 * Route seeding script — populates Supabase with route analysis, bingo items,
 * and route guide blurbs for a set of predefined corridors.
 *
 * Usage:
 *   node scripts/seed.mjs              # seed all routes (skip ones already seeded)
 *   node scripts/seed.mjs --force      # re-seed everything even if it exists
 *   node scripts/seed.mjs "NYC" "DC"   # seed a single route by partial name match
 *
 * Requires this table in Supabase (run once in SQL editor):
 *   CREATE TABLE route_blurbs (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     route_id uuid REFERENCES routes(id) ON DELETE CASCADE NOT NULL,
 *     leg text NOT NULL,
 *     description text NOT NULL,
 *     created_at timestamptz DEFAULT now(),
 *     UNIQUE(route_id, leg)
 *   );
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ── Load .env.local before any lib imports (Supabase client reads env at init) ──
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");
try {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0 && !line.trimStart().startsWith("#")) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  }
  console.log("✓ Loaded .env.local");
} catch {
  console.log("⚠ No .env.local found — relying on environment variables");
}

// ── Dynamic imports so env vars are set first ──
const { askClaude } = await import("../lib/claude.js");
const { findOrCreateRoute, saveGeneratedItems, getRouteItems } = await import("../lib/db.js");
const {
  ANALYZE_ROUTE_SYSTEM,
  GENERATE_ITEMS_SYSTEM,
  generateItemsUserPrompt,
  GENERATE_BLURB_SYSTEM,
  generateBlurbUserPrompt,
} = await import("../lib/prompts.js");
const { createClient } = await import("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ═══════════════════════════════════════════════════════════════
// ROUTES TO SEED
// ═══════════════════════════════════════════════════════════════

const ROUTES = [
  // ── US ──
  { label: "I-95 NYC → DC",             from: "New York, NY",       to: "Washington, DC" },
  { label: "I-95 DC → Miami",           from: "Washington, DC",     to: "Miami, FL" },
  { label: "I-75 Atlanta → Miami",      from: "Atlanta, GA",        to: "Miami, FL" },
  { label: "I-10 Houston → NOLA",       from: "Houston, TX",        to: "New Orleans, LA" },
  { label: "I-5 LA → SF",              from: "Los Angeles, CA",    to: "San Francisco, CA" },
  { label: "I-40 Nashville → Memphis",  from: "Nashville, TN",      to: "Memphis, TN" },
  { label: "I-90 Chicago → Cleveland",  from: "Chicago, IL",        to: "Cleveland, OH" },
  { label: "I-70 Denver → KC",         from: "Denver, CO",         to: "Kansas City, MO" },
  { label: "I-95 Boston → NYC",        from: "Boston, MA",         to: "New York, NY" },
  { label: "I-85 Charlotte → Atlanta", from: "Charlotte, NC",      to: "Atlanta, GA" },
  { label: "I-26 Asheville → Charleston", from: "Asheville, NC",   to: "Charleston, SC" },
  { label: "Pittsboro NC → Myrtle Beach", from: "Pittsboro, NC",   to: "Myrtle Beach, SC" },
  // ── Europe ──
  { label: "Paris → Berlin",           from: "Paris, France",      to: "Berlin, Germany" },
  { label: "Rome → Florence",          from: "Rome, Italy",        to: "Florence, Italy" },
  { label: "London → Edinburgh",       from: "London, England",    to: "Edinburgh, Scotland" },
  { label: "Barcelona → Madrid",       from: "Barcelona, Spain",   to: "Madrid, Spain" },
  // ── Australia ──
  { label: "Sydney → Melbourne",       from: "Sydney, NSW",        to: "Melbourne, VIC" },
  { label: "Great Ocean Road",         from: "Melbourne, VIC",     to: "Warrnambool, VIC" },
  // ── Africa ──
  { label: "Cape Town → Johannesburg", from: "Cape Town, South Africa", to: "Johannesburg, South Africa" },
  // ── Latin America ──
  { label: "San José → La Fortuna",   from: "San José, Costa Rica",    to: "La Fortuna, Costa Rica" },
];

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const TARGET_ITEMS = 36;       // items to have in DB per route
const ITEMS_PER_BATCH = 20;    // max Claude generates per call
const DELAY_BETWEEN_CALLS = 2000;  // ms between Claude API calls
const DELAY_BETWEEN_ROUTES = 3000; // ms between routes

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════
// SEED ONE ROUTE
// ═══════════════════════════════════════════════════════════════

async function seedRoute({ from, to, label }, { force = false } = {}) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`  ${from} → ${to}`);
  console.log(`${"─".repeat(60)}`);

  // ── Step 1: Route analysis ──
  console.log("  [1/3] Analyzing route...");
  const routePrompt = `Starting point: ${from}\nDestination: ${to}\n\nAnalyze the most common driving route and return the route data as JSON.`;
  const routeData = await askClaude(ANALYZE_ROUTE_SYSTEM, routePrompt);

  if (!routeData?.route_name) {
    throw new Error("Route analysis returned invalid data");
  }
  console.log(`        Route: ${routeData.route_name}`);
  console.log(`        ~${routeData.estimated_hours ?? "?"}h / ~${routeData.estimated_miles ?? "?"}mi`);

  // ── Step 2: Save route to DB ──
  const route = await findOrCreateRoute({ from, to, routeAnalysis: routeData });
  console.log(`        DB id: ${route.id}`);

  // ── Step 3: Bingo items ──
  console.log("  [2/3] Generating bingo items...");
  let existingItems = force ? [] : await getRouteItems(route.id);
  console.log(`        Existing: ${existingItems.length} items`);

  if (force && existingItems.length > 0) {
    const { error } = await supabase
      .from("route_items")
      .delete()
      .eq("route_id", route.id)
      .neq("tier", "legendary")
      .neq("tier", "listed")
      .neq("tier", "community_verified");
    if (error) console.warn("        Could not clear items:", error.message);
    else { existingItems = []; console.log("        Cleared existing items (keeping curated tiers)"); }
  }

  let allItems = [...existingItems];
  let batch = 1;

  while (allItems.length < TARGET_ITEMS) {
    const needed = TARGET_ITEMS - allItems.length;
    const count = Math.min(needed, ITEMS_PER_BATCH);
    console.log(`        Batch ${batch}: requesting ${count} items...`);

    const itemPrompt = generateItemsUserPrompt({
      route_name: routeData.route_name,
      route_summary: routeData.route_summary,
      major_waypoints: routeData.major_waypoints,
      from,
      to,
      existingItemNames: allItems.map((i) => i.name),
      count,
    });

    const result = await askClaude(GENERATE_ITEMS_SYSTEM, itemPrompt);

    if (result?.items?.length) {
      await saveGeneratedItems(route.id, result.items);
      allItems = [...allItems, ...result.items];
      console.log(`        Total: ${allItems.length} items`);
    } else {
      console.warn("        Batch returned no items — stopping early");
      break;
    }

    batch++;
    if (allItems.length < TARGET_ITEMS) await sleep(DELAY_BETWEEN_CALLS);
  }

  // ── Step 4: Route guide blurbs ──
  await sleep(DELAY_BETWEEN_CALLS);
  console.log("  [3/3] Generating route guide...");

  const blurbPrompt = generateBlurbUserPrompt({
    route_name: routeData.route_name,
    route_summary: routeData.route_summary,
    major_waypoints: routeData.major_waypoints,
    from,
    to,
  });
  const blurbData = await askClaude(GENERATE_BLURB_SYSTEM, blurbPrompt);

  if (blurbData?.blurbs?.length) {
    const rows = blurbData.blurbs.map((b) => ({
      route_id: route.id,
      leg: b.leg,
      description: b.description,
    }));
    const { error } = await supabase
      .from("route_blurbs")
      .upsert(rows, { onConflict: "route_id,leg" });
    if (error) {
      // Table might not exist yet — warn but don't fail
      console.warn(`        Blurb save skipped: ${error.message}`);
      console.warn(`        (Create the route_blurbs table — see script header for SQL)`);
    } else {
      console.log(`        Saved ${blurbData.blurbs.length} leg blurbs`);
    }
  }

  console.log(`  ✓ Done — ${allItems.length} items, route guide saved`);
  return { label, itemCount: allItems.length };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const filterArgs = args.filter((a) => !a.startsWith("--"));

  // Filter to specific routes if args provided
  let routesToSeed = ROUTES;
  if (filterArgs.length > 0) {
    const query = filterArgs.join(" ").toLowerCase();
    routesToSeed = ROUTES.filter(
      (r) =>
        r.label.toLowerCase().includes(query) ||
        r.from.toLowerCase().includes(query) ||
        r.to.toLowerCase().includes(query)
    );
    if (routesToSeed.length === 0) {
      console.error(`No routes matched "${query}"`);
      process.exit(1);
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  HIGHWAY BINGO — Route Seeder`);
  console.log(`  Seeding ${routesToSeed.length} route(s)${force ? " (force mode)" : ""}`);
  console.log(`${"═".repeat(60)}`);

  const results = [];
  let failed = 0;

  for (let i = 0; i < routesToSeed.length; i++) {
    const route = routesToSeed[i];
    console.log(`\n  Route ${i + 1}/${routesToSeed.length}`);
    try {
      const result = await seedRoute(route, { force });
      results.push(result);
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      results.push({ label: route.label, error: err.message });
      failed++;
    }
    if (i < routesToSeed.length - 1) await sleep(DELAY_BETWEEN_ROUTES);
  }

  // ── Summary ──
  console.log(`\n${"═".repeat(60)}`);
  console.log("  SUMMARY");
  console.log(`${"═".repeat(60)}`);
  for (const r of results) {
    if (r.error) {
      console.log(`  ✗ ${r.label} — ${r.error}`);
    } else {
      console.log(`  ✓ ${r.label} — ${r.itemCount} items`);
    }
  }
  console.log(`\n  ${results.length - failed} succeeded, ${failed} failed`);
  console.log(`${"═".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
