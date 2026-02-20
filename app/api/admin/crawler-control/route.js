import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase.js";

function checkAuth(request) {
  const token = request.headers.get("x-admin-token");
  const correct = process.env.ADMIN_PASSWORD;
  if (!correct || !token) return false;
  try { return Buffer.from(token, "base64").toString() === correct; } catch { return false; }
}

export async function POST(request) {
  if (!checkAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, routeId, corridorId, dailyLimit } = await request.json();

  if (action === "force-crawl" && corridorId) {
    // Reset sample_index to 0 so the route crawls from the start on next run
    const { error } = await supabaseAdmin
      .from("crawler_progress")
      .update({ status: "queued", sample_index: 0, updated_at: new Date().toISOString() })
      .eq("route_id", routeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: `Reset ${corridorId} — will crawl from start` });
  }

  if (action === "reset-route" && routeId) {
    await supabaseAdmin
      .from("crawler_progress")
      .update({ status: "queued", sample_index: 0, items_found: 0, items_rejected: 0, updated_at: new Date().toISOString() })
      .eq("route_id", routeId);
    return NextResponse.json({ ok: true });
  }

  if (action === "trigger-now") {
    // Manually trigger the cron endpoint
    const baseUrl = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/cron/crawl-places`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET || ""}` },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: true, cronResult: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
