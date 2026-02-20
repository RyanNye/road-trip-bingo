import { supabaseAdmin as supabase } from "./supabase.js";
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

// Slug of just the city component — used for fuzzy corridor matching.
// "Pittsboro, NC 27312, USA" → "pittsboro"
function citySlug(s) {
  return (s || "").split(",")[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function findOrCreateRoute({ from, to, routeAnalysis }) {
  const corridorId = makeCorridorId(from, to);

  // 1) Exact corridor_id match
  let { data: existing } = await supabase
    .from("routes")
    .select("*")
    .eq("corridor_id", corridorId)
    .maybeSingle();

  // 2) Fuzzy match by city slug — handles Google Autocomplete returning
  //    "Pittsboro, NC 27312, USA" instead of the crawler's "Pittsboro, NC".
  if (!existing) {
    const fromSlug = citySlug(from);
    const toSlug   = citySlug(to);
    const { data: fuzzy } = await supabase
      .from("routes")
      .select("*")
      .ilike("corridor_id", `${fromSlug}%--${toSlug}%`)
      .limit(1)
      .maybeSingle();
    if (fuzzy) {
      console.log(`[db] fuzzy corridor match: ${corridorId} → ${fuzzy.corridor_id}`);
      existing = fuzzy;
    }
  }

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
    .eq("visible_from_highway", true)
    .order("tier", { ascending: true });

  if (error) throw new Error(`Failed to fetch route items: ${error.message}`);
  return (data || []).map(dbItemToFrontend);
}

export async function getItemsNearRoute(routeCoords, radiusKm = 20) {
  // Fetch only bingo-eligible (visible_from_highway) items that have coordinates
  const { data, error } = await supabase
    .from("route_items")
    .select("*")
    .neq("tier", "excluded")
    .eq("visible_from_highway", true)
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

// ─── Blurb helpers ───

export async function findRouteId(from, to) {
  const corridorId = makeCorridorId(from, to);

  // Exact match first
  let { data } = await supabase
    .from("routes")
    .select("id")
    .eq("corridor_id", corridorId)
    .maybeSingle();

  // Fuzzy match — handles autocomplete vs crawler string differences
  if (!data) {
    const fromSlug = citySlug(from);
    const toSlug   = citySlug(to);
    const { data: fuzzy } = await supabase
      .from("routes")
      .select("id")
      .ilike("corridor_id", `${fromSlug}%--${toSlug}%`)
      .limit(1)
      .maybeSingle();
    if (fuzzy) data = fuzzy;
  }

  return data?.id || null;
}

// Returns up to 30 items (both bingo-visible and trivia-only) for blurb context.
// Excludes wildcards (admin_curated) since those are generic, not route-specific.
export async function getRouteItemsForBlurb(routeId) {
  const { data, error } = await supabase
    .from("route_items")
    .select("name, category, route_description, visible_from_highway")
    .eq("route_id", routeId)
    .neq("tier", "excluded")
    .neq("source", "admin_curated")
    .order("visible_from_highway", { ascending: false }); // closest items first

  if (error) return [];
  return (data || []).slice(0, 30);
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
