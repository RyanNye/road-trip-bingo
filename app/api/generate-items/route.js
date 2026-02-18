import { NextResponse } from "next/server";
import { askClaude } from "../../../lib/claude.js";
import { findOrCreateRoute, getRouteItems, getItemsNearRoute, saveGeneratedItems } from "../../../lib/db.js";
import { GENERATE_ITEMS_SYSTEM, generateItemsUserPrompt } from "../../../lib/prompts.js";

const TARGET_ITEMS = 32;

export async function POST(request) {
  try {
    const { route_name, route_summary, major_waypoints, route_coordinates, from, to, _routeId } =
      await request.json();

    // Step 1: Resolve routeId — use provided _routeId or find/create from from+to
    let routeId = _routeId || null;
    if (!routeId && from && to) {
      try {
        const route = await findOrCreateRoute({
          from,
          to,
          routeAnalysis: { route_name, route_summary, route_coordinates },
        });
        routeId = route.id;
      } catch (e) {
        console.warn("[generate-items] findOrCreateRoute failed:", e.message);
      }
    }

    // Step 2: Try to get items already saved for this route
    let dbItems = [];
    if (routeId) {
      dbItems = await getRouteItems(routeId);
    }

    // Step 3: If no route-specific items, try geo-matching across all items
    if (dbItems.length === 0 && route_coordinates?.length) {
      dbItems = await getItemsNearRoute(route_coordinates, 20);
    }

    // Step 4: Calculate how many more items Claude needs to generate
    const needed = Math.max(0, TARGET_ITEMS - dbItems.length);

    let claudeItems = [];
    if (needed > 0) {
      const userPrompt = generateItemsUserPrompt({
        route_name,
        route_summary,
        major_waypoints,
        from,
        to,
        existingItemNames: dbItems.map((i) => i.name),
        count: needed,
      });

      const result = await askClaude(GENERATE_ITEMS_SYSTEM, userPrompt);

      if (result?.items && Array.isArray(result.items)) {
        claudeItems = result.items;
        if (routeId) {
          await saveGeneratedItems(routeId, claudeItems);
        }
      }
    }

    return NextResponse.json({ items: [...dbItems, ...claudeItems], _routeId: routeId });
  } catch (error) {
    console.error("generate-items error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
