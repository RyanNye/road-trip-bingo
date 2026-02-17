import { NextResponse } from "next/server";
import { askClaude } from "../../../lib/claude.js";
import { ANALYZE_ROUTE_SYSTEM } from "../../../lib/prompts.js";
import { findOrCreateRoute, logSearch } from "../../../lib/db.js";

export async function POST(request) {
  try {
    const { from, to, waypoints } = await request.json();
    console.log("[analyze-route] request:", { from, to, waypoints });

    if (!from || !to) {
      return NextResponse.json({ error: "from and to are required" }, { status: 400 });
    }

    const waypointText = waypoints?.length
      ? `\nRequired waypoints (in order): ${waypoints.join(", ")}`
      : "";

    const userPrompt = `Starting point: ${from}\nDestination: ${to}${waypointText}\n\nAnalyze the most common driving route and return the route data as JSON.`;

    console.log("[analyze-route] calling Claude...");
    const result = await askClaude(ANALYZE_ROUTE_SYSTEM, userPrompt);
    console.log("[analyze-route] Claude response type:", typeof result);

    if (typeof result === "string") {
      console.error("[analyze-route] Claude returned unparseable text:", result.slice(0, 500));
      return NextResponse.json({ error: "Failed to parse route analysis" }, { status: 500 });
    }

    // Upsert route in DB and log the search
    console.log("[analyze-route] saving route to DB...");
    const route = await findOrCreateRoute({ from, to, routeAnalysis: result });
    await logSearch({ from, to, routeId: route.id });
    console.log("[analyze-route] done, routeId:", route.id);

    return NextResponse.json({ ...result, _routeId: route.id });
  } catch (error) {
    console.error("[analyze-route] error:", error.message);
    console.error("[analyze-route] stack:", error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
