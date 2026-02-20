import { NextResponse } from "next/server";
import { askClaude } from "../../../lib/claude.js";
import { findOrCreateRoute, getRouteItems, getItemsNearRoute, saveGeneratedItems } from "../../../lib/db.js";
import { findItemsNearRoute } from "../../../lib/geo.js";
import { GENERATE_ITEMS_SYSTEM, generateItemsUserPrompt } from "../../../lib/prompts.js";

const TARGET_ITEMS    = 32;
const DB_SHARE        = 0.70; // ~70% drawn from crawled DB pool
const AI_SHARE        = 0.20; // ~20% Claude generates fresh from regional knowledge
const WILDCARD_SHARE  = 0.10; // ~10% wildcards
const LEG_RADIUS_KM   = 2.01; // 1.25 miles — max distance from leg polyline to count an item

const WILDCARD_POOL = [
  { name: "Out-of-state license plate",   emoji: "🚗", desc: "Spot a car with a license plate from a different state.", category: "weird_fun" },
  { name: "Car pulling a boat",           emoji: "⛵", desc: "A vehicle towing a boat on a trailer.",                  category: "weird_fun" },
  { name: "Oversized load truck",         emoji: "🚛", desc: "A truck carrying an oversized load with escort vehicles.", category: "weird_fun" },
  { name: "RV with bikes on the back",    emoji: "🚐", desc: "A motorhome or camper with bicycles on the rear rack.",  category: "weird_fun" },
  { name: "Classic car (pre-1980)",       emoji: "🚙", desc: "A vintage automobile from 1980 or earlier.",             category: "weird_fun" },
  { name: "Horse trailer",               emoji: "🐴", desc: "A trailer for horses hitched to a pickup truck.",        category: "weird_fun" },
  { name: "Motorcycle group (5+ riders)", emoji: "🏍️", desc: "Five or more motorcycles riding together.",             category: "weird_fun" },
  { name: "Car with a kayak on top",      emoji: "🛶", desc: "A vehicle with a kayak strapped to the roof rack.",     category: "weird_fun" },
  { name: "Convertible with top down",    emoji: "🌬️", desc: "A convertible car cruising with the roof retracted.",   category: "weird_fun" },
  { name: "Dog with head out the window", emoji: "🐶", desc: "A very happy dog enjoying the wind from a car window.", category: "weird_fun" },
  { name: "Double-decker car hauler",     emoji: "🚛", desc: "An auto-transport truck carrying cars on two levels.",  category: "weird_fun" },
  { name: "Police traffic stop",          emoji: "🚔", desc: "A police vehicle with lights on, pulled over on the shoulder.", category: "weird_fun" },
  { name: "Road construction crew",       emoji: "🦺", desc: "Workers actively doing road construction or maintenance.", category: "weird_fun" },
  { name: "Farm tractor on the road",     emoji: "🚜", desc: "A farm tractor driving on or crossing the highway.",    category: "weird_fun" },
  { name: "Car with a Christmas tree",    emoji: "🎄", desc: "A vehicle with a Christmas tree strapped to the roof.", category: "weird_fun" },
];

function pickWildcards(count) {
  return [...WILDCARD_POOL].sort(() => Math.random() - 0.5).slice(0, count);
}

export async function POST(request) {
  try {
    const { route_name, route_summary, major_waypoints, route_coordinates, from, to, _routeId } =
      await request.json();

    // Step 1: Resolve routeId
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
    console.log(`[generate-items] from="${from}" to="${to}" routeId=${routeId}`);

    // Step 2: Get all crawled items for this route from DB
    let allDbItems = [];
    if (routeId) {
      allDbItems = await getRouteItems(routeId);
    }
    console.log(`[generate-items] step2 routeItems=${allDbItems.length}`);

    // Step 3: If no route-specific items, geo-match across all routes
    if (allDbItems.length === 0 && route_coordinates?.length) {
      allDbItems = await getItemsNearRoute(route_coordinates, 20);
    }
    console.log(`[generate-items] step3 afterGeo=${allDbItems.length} coords=${route_coordinates?.length ?? 0}`);

    // Step 4: Assign geocoded items to this leg only.
    // Items with lat/lng must be within 2 miles of THIS leg's polyline.
    // Items without lat/lng (generics, ai items without coords) apply to any leg.
    let legPool;
    if (route_coordinates?.length) {
      const geocoded    = allDbItems.filter((i) => i.latitude != null && i.longitude != null);
      const nonGeocoded = allDbItems.filter((i) => i.latitude == null || i.longitude == null);

      // findItemsNearRoute returns items sorted by distance, already filtered to radius
      const nearThisLeg = findItemsNearRoute(geocoded, route_coordinates, LEG_RADIUS_KM);

      legPool = [...nearThisLeg, ...nonGeocoded];
    } else {
      // No leg polyline provided — use all items (single-leg or fallback)
      legPool = allDbItems;
    }

    // Deduplicate leg pool by name (guards against items inserted twice in DB)
    const poolSeen = new Set();
    legPool = legPool.filter((item) => {
      const key = item.name.trim().toLowerCase();
      if (poolSeen.has(key)) return false;
      poolSeen.add(key);
      return true;
    });

    // Step 5: Draw ~70% from leg pool (shuffled so cards vary between sessions)
    const dbTarget       = Math.round(TARGET_ITEMS * DB_SHARE);     // ~22
    const aiTarget       = Math.round(TARGET_ITEMS * AI_SHARE);     // ~6
    const wildcardTarget = TARGET_ITEMS - dbTarget - aiTarget;      // ~4

    const shuffledPool = [...legPool].sort(() => Math.random() - 0.5);
    const selectedDb   = shuffledPool.slice(0, Math.min(dbTarget, legPool.length));

    // If the leg pool is thin, Claude covers the gap
    const aiNeeded = aiTarget + Math.max(0, dbTarget - selectedDb.length);

    // Step 6: Claude generates fresh leg-specific items
    let claudeItems = [];
    if (aiNeeded > 0) {
      const userPrompt = generateItemsUserPrompt({
        route_name,
        route_summary,
        major_waypoints,
        from,
        to,
        existingItemNames: selectedDb.map((i) => i.name),
        count: aiNeeded,
      });

      const result = await askClaude(GENERATE_ITEMS_SYSTEM, userPrompt);

      if (result?.items && Array.isArray(result.items)) {
        // Drop any Claude item whose name matches something already selected from DB
        const selectedNames = new Set(selectedDb.map((i) => i.name.trim().toLowerCase()));
        claudeItems = result.items.filter((i) => !selectedNames.has(i.name?.trim().toLowerCase()));
        if (routeId) {
          await saveGeneratedItems(routeId, claudeItems);
        }
      }
    }

    // Step 7: Add wildcards (wildcard names are distinct from DB/Claude items by design)
    const wildcards = pickWildcards(wildcardTarget);

    return NextResponse.json({
      items:    [...selectedDb, ...claudeItems, ...wildcards],
      _routeId: routeId,
    });
  } catch (error) {
    console.error("generate-items error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
