import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase.js";

function checkAuth(request) {
  const token = request.headers.get("x-admin-token");
  const correct = process.env.ADMIN_PASSWORD;
  if (!correct || !token) return false;
  try { return Buffer.from(token, "base64").toString() === correct; } catch { return false; }
}

export async function GET(request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Route progress
  const { data: progress } = await supabaseAdmin
    .from("crawler_progress")
    .select(`
      id, status, region,
      total_km, crawled_km, sample_index,
      items_found, items_rejected,
      last_lat, last_lng, last_crawled_at,
      first_crawled_at, error_message,
      route_id,
      routes ( corridor_name, route_from, route_to, search_count )
    `)
    .order("region")
    .order("status");

  // Last 14 days of daily logs
  const { data: dailyLogs } = await supabaseAdmin
    .from("crawler_daily_log")
    .select("log_date, searches_used, items_added, items_rejected, api_cost_cents, region")
    .order("log_date", { ascending: false })
    .limit(14);

  // Summary counts
  const { data: summary } = await supabaseAdmin
    .from("route_items")
    .select("visible_from_highway, source, tier")
    .select("visible_from_highway");

  const { count: totalItems } = await supabaseAdmin
    .from("route_items")
    .select("*", { count: "exact", head: true });

  const { count: visibleItems } = await supabaseAdmin
    .from("route_items")
    .select("*", { count: "exact", head: true })
    .eq("visible_from_highway", true);

  const { count: crawlerItems } = await supabaseAdmin
    .from("route_items")
    .select("*", { count: "exact", head: true })
    .eq("source", "crawler");

  // Settings (daily limit override stored in DB if it exists)
  const { data: settings } = await supabaseAdmin
    .from("crawler_settings")
    .select("*")
    .maybeSingle()
    .catch(() => ({ data: null }));

  return NextResponse.json({
    progress: progress || [],
    dailyLogs: dailyLogs || [],
    counts: { totalItems, visibleItems, crawlerItems },
    settings: settings || { daily_limit: 190, paused: false },
  });
}
