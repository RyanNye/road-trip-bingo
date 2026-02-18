import { NextResponse } from "next/server";
import { askClaude } from "../../../lib/claude.js";
import {
  GENERATE_BLURB_SYSTEM, generateBlurbUserPrompt,
  GENERATE_LEG_BLURB_SYSTEM, generateLegBlurbUserPrompt,
} from "../../../lib/prompts.js";
import { supabaseAdmin } from "../../../lib/supabase.js";

// Normalize a city string into a stable cache key segment
// "Chapel Hill, NC" → "chapel-hill-nc"
function normSegment(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function makeCacheKey(from, to, legMode) {
  const prefix = legMode ? "leg--" : "";
  return `${prefix}${normSegment(from)}--${normSegment(to)}`;
}

export async function POST(request) {
  try {
    const { route_name, route_summary, major_waypoints, from, to, leg_mode } =
      await request.json();

    const cacheKey = makeCacheKey(from, to, leg_mode);

    // ── Cache read ─────────────────────────────────────────────
    const { data: cached } = await supabaseAdmin
      .from("blurb_cache")
      .select("blurbs")
      .eq("cache_key", cacheKey)
      .single();

    if (cached?.blurbs) {
      return NextResponse.json({ blurbs: cached.blurbs, _cached: true });
    }

    // ── Generate ───────────────────────────────────────────────
    const [systemPrompt, userPrompt] = leg_mode
      ? [GENERATE_LEG_BLURB_SYSTEM, generateLegBlurbUserPrompt({ from, to })]
      : [GENERATE_BLURB_SYSTEM, generateBlurbUserPrompt({ route_name, route_summary, major_waypoints, from, to })];

    const result = await askClaude(systemPrompt, userPrompt);

    if (typeof result === "string" || !result?.blurbs) {
      return NextResponse.json({ error: "Failed to parse blurbs" }, { status: 500 });
    }

    // ── Cache write ────────────────────────────────────────────
    // Fire-and-forget — don't block the response on a DB write
    supabaseAdmin
      .from("blurb_cache")
      .upsert(
        { cache_key: cacheKey, from_city: from, to_city: to, blurbs: result.blurbs },
        { onConflict: "cache_key" }
      )
      .then(({ error }) => {
        if (error) console.warn("blurb_cache write failed:", error.message);
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error("generate-blurb error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
