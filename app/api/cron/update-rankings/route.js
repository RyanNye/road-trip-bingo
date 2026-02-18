import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

// Region classification helpers
const US_STATE_RE = /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$/i;
const CANADA_RE  = /,\s*(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)$/i;
const MEXICO_RE  = /mexico/i;

const EUROPE_COUNTRIES  = ["france","germany","italy","spain","portugal","netherlands","belgium","austria","switzerland","poland","sweden","norway","denmark","finland","greece","czech","hungary","romania","scotland","england","wales","ireland","uk"];
const LATAM_COUNTRIES   = ["mexico","costa rica","panama","colombia","venezuela","peru","ecuador","bolivia","chile","argentina","brazil","guatemala","honduras","el salvador","nicaragua","belize","cuba","dominican"];
const AFRICA_COUNTRIES  = ["south africa","kenya","tanzania","egypt","morocco","ethiopia","ghana","nigeria","namibia","botswana","zimbabwe","uganda","senegal","cameroon","mozambique"];
const EAST_ASIA_COUNTRIES  = ["japan","china","south korea","taiwan","hong kong","mongolia"];
const SOUTH_ASIA_COUNTRIES = ["india","thailand","vietnam","indonesia","malaysia","singapore","philippines","myanmar","cambodia","laos","sri lanka","nepal","bangladesh","pakistan"];
const WEST_ASIA_COUNTRIES  = ["turkey","jordan","uae","saudi arabia","israel","iran","iraq","oman","qatar","kuwait","bahrain","lebanon","syria","azerbaijan","georgia","armenia"];
const AUSTRALIA_COUNTRIES  = ["australia","new zealand","fiji","papua new guinea","nsw","vic","qld","wa","sa","nt","act","tas"];

function classifyRegion(from, to) {
  const locs = [from, to].map((s) => s.toLowerCase());

  const isUS     = locs.some((s) => US_STATE_RE.test(s));
  const isCanada = locs.some((s) => CANADA_RE.test(s));
  const isMexico = locs.some((s) => MEXICO_RE.test(s));

  if (isUS || isCanada) return "north-america";
  if (isMexico)         return "latin-america";

  const check = (keywords) => locs.some((s) => keywords.some((k) => s.includes(k)));

  if (check(EUROPE_COUNTRIES))     return "europe";
  if (check(LATAM_COUNTRIES))      return "latin-america";
  if (check(AFRICA_COUNTRIES))     return "africa";
  if (check(EAST_ASIA_COUNTRIES))  return "east-asia";
  if (check(SOUTH_ASIA_COUNTRIES)) return "south-asia";
  if (check(WEST_ASIA_COUNTRIES))  return "west-asia";
  if (check(AUSTRALIA_COUNTRIES))  return "australia";

  return null; // unclassified — skip
}

export async function GET(request) {
  // Auth check — Vercel Cron sends the secret in the Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Fetch all routes with search counts
    const { data: routes, error: routesErr } = await supabase
      .from("routes")
      .select("id, corridor_id, route_from, route_to, search_count")
      .order("search_count", { ascending: false });

    if (routesErr) throw new Error(routesErr.message);

    // Fetch yesterday's rankings for movement comparison
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const { data: prevRankings } = await supabase
      .from("route_rankings")
      .select("region, rank, corridor_id")
      .eq("snapshot_date", yesterday);

    // Build previous rank lookup: { region: { corridor_id: rank } }
    const prevRankMap = {};
    for (const r of prevRankings || []) {
      if (!prevRankMap[r.region]) prevRankMap[r.region] = {};
      prevRankMap[r.region][r.corridor_id] = r.rank;
    }

    // Group routes by region
    const byRegion = {};
    for (const route of routes || []) {
      const region = classifyRegion(route.route_from, route.route_to);
      if (!region) continue;
      if (!byRegion[region]) byRegion[region] = [];
      byRegion[region].push(route);
    }

    // Build ranking rows
    const rows = [];
    for (const [region, regionRoutes] of Object.entries(byRegion)) {
      const top20 = regionRoutes.slice(0, 20);
      const prevMap = prevRankMap[region] || {};

      top20.forEach((route, idx) => {
        const rank = idx + 1;
        const prevRank = prevMap[route.corridor_id];
        let movement;
        if (!prevRank) {
          movement = "new";
        } else if (rank < prevRank) {
          movement = "up";
        } else if (rank > prevRank) {
          movement = "down";
        } else {
          movement = "same";
        }

        rows.push({
          snapshot_date: today,
          region,
          rank,
          corridor_id: route.corridor_id,
          route_id: route.id,
          route_from: route.route_from,
          route_to: route.route_to,
          search_count: route.search_count || 0,
          previous_rank: prevRank || null,
          movement,
        });
      });
    }

    // Upsert today's snapshot (idempotent if run twice)
    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from("route_rankings")
        .upsert(rows, { onConflict: "snapshot_date,region,rank" });
      if (upsertErr) throw new Error(upsertErr.message);
    }

    return NextResponse.json({
      ok: true,
      date: today,
      regions: Object.keys(byRegion).length,
      rows: rows.length,
    });
  } catch (err) {
    console.error("[update-rankings] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
