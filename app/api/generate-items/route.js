import { NextResponse } from "next/server";
import { askClaude } from "../../../lib/claude.js";
import { getRouteItems, getItemsNearRoute, saveGeneratedItems } from "../../../lib/db.js";
import { GENERATE_ITEMS_SYSTEM, generateItemsUserPrompt } from "../../../lib/prompts.js";

const TARGET_ITEMS = 32;

export async function POST(request) {
  try {
    const { route_name, route_summary, major_waypoints, route_coordinates, from, to, _routeId } =
      await request.json();

    // Step 1: Try to get items already saved for this route
    let dbItems = [];
    if (_routeId) {
      dbItems = await getRouteItems(_routeId);
    }

    // Step 2: If no route-specific items, try geo-matching across all items
    if (dbItems.length === 0 && route_coordinates?.length) {
      dbItems = await getItemsNearRoute(route_coordinates, 20);
    }

    // Step 3: Calculate how many more items Claude needs to generate
    const existingCount = dbItems.length;
    const needed = Math.max(0, TARGET_ITEMS - existingCount);

    let claudeItems = [];
    if (needed > 0) {
      const existingItemNames = dbItems.map((i) => i.name);
      const userPrompt = generateItemsUserPrompt({
        route_name,
        route_summary,
        major_waypoints,
        from,
        to,
        existingItemNames,
        count: needed,
      });

      const result = await askClaude(GENERATE_ITEMS_SYSTEM, userPrompt);

      if (result?.items && Array.isArray(result.items)) {
        claudeItems = result.items;

        // Save AI-generated items back to DB for this route
        if (_routeId) {
          await saveGeneratedItems(_routeId, claudeItems);
        }
      }
    }

    const allItems = [...dbItems, ...claudeItems];

    return NextResponse.json({ items: allItems });
  } catch (error) {
    console.error("generate-items error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
