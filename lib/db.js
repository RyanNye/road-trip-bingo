import { supabase } from "./supabase.js";
import { findItemsNearRoute } from "./geo.js";

const CATEGORY_EMOJI = {
  nature: "🌿",
  history: "🏛️",
  culture: "🎭",
  infrastructure: "🚧",
  vehicles: "🚗",
  weird_fun: "🤪",
};

// ─── Route helpers ───

function makeCorridorId(from, to) {
  const normalize = (s) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${normalize(from)}--${normalize(to)}`;
}

export async function findOrCreateRoute({ from, to, routeAnalysis }) {
  const corridorId = makeCorridorId(from, to);

  // Check if route exists
  const { data: existing } = await supabase
    .from("routes")
    .select("*")
    .eq("corridor_id", corridorId)
    .single();

  if (existing) {
    // Bump search count
    await supabase
      .from("routes")
      .update({
        search_count: (existing.search_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return existing;
  }

  // Create new route
  const { data: newRoute, error } = await supabase
    .from("routes")
    .insert({
      corridor_id: corridorId,
      corridor_name: `${from} to ${to}`,
      route_from: from,
      route_to: to,
      highway_names: routeAnalysis.route_name ? [routeAnalysis.route_name] : [],
      route_summary: routeAnalysis.route_summary,
      polyline: JSON.stringify(routeAnalysis.route_coordinates),
      search_count: 1,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create route: ${error.message}`);
  return newRoute;
}

// ─── Search log ───

export async function logSearch({ from, to, routeId, userId }) {
  await supabase.from("search_log").insert({
    route_from: from,
    route_to: to,
    route_id: routeId || null,
    user_id: userId || null,
  });
}

// ─── Route items ───

export async function getRouteItems(routeId) {
  const { data, error } = await supabase
    .from("route_items")
    .select("*")
    .eq("route_id", routeId)
    .neq("tier", "excluded")
    .order("tier", { ascending: true });

  if (error) throw new Error(`Failed to fetch route items: ${error.message}`);
  return (data || []).map(dbItemToFrontend);
}

export async function getItemsNearRoute(routeCoords, radiusKm = 20) {
  // Fetch all non-excluded items that have coordinates
  const { data, error } = await supabase
    .from("route_items")
    .select("*")
    .neq("tier", "excluded")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) throw new Error(`Failed to fetch items for geo-match: ${error.message}`);
  if (!data?.length) return [];

  // Map to format expected by geo.js
  const geoItems = data.map((item) => ({
    ...item,
    latitude: item.latitude,
    longitude: item.longitude,
  }));

  const nearby = findItemsNearRoute(geoItems, routeCoords, radiusKm);
  return nearby.map(dbItemToFrontend);
}

export async function saveGeneratedItems(routeId, items) {
  if (!items.length) return;

  const rows = items.map((item) => ({
    route_id: routeId,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory || null,
    tier: "generic",
    route_description: item.desc,
    visible_from_highway: true,
    source: "ai_generated",
    latitude: item.lat || null,
    longitude: item.lng || null,
  }));

  const { error } = await supabase.from("route_items").insert(rows);
  if (error) console.error("Failed to save generated items:", error.message);
}

// ─── Feedback ───

export async function submitFeedback({ routeId, items }) {
  if (!items?.length) return;
  const rows = items.map(({ name, response, note }) => ({
    route_id: routeId || null,
    item_name: name,
    response,
    note: note || null,
  }));
  const { error } = await supabase.from("feedback").insert(rows);
  if (error) throw new Error(`Failed to save feedback: ${error.message}`);
}

// ─── Mapping ───

function dbItemToFrontend(item) {
  return {
    name: item.name,
    emoji: CATEGORY_EMOJI[item.category] || "📍",
    desc: item.route_description || "",
    category: item.category,
    tier: item.tier,
  };
}
