import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { haversine } from "../../../../lib/geo.js";

// ================================================================
// CONFIG (mirrors scripts/crawl-places.mjs)
// ================================================================

const DAILY_LIMIT        = 190;
const SAMPLE_INTERVAL_KM = 15;
const SEARCH_RADIUS_M    = 25000;
const MIN_RATING         = 3.5;
const VISIBLE_DIST_KM    = 1.2;   // 0.75 miles — bingo-eligible
const TRIVIA_DIST_KM     = 16.1;  // 10 miles — trivia/blurb only
const GENERIC_CLUSTER_MIN = 3;
const GENERIC_CLUSTER_KM  = 48;
const MAX_RUN_MS          = 50000; // hard-stop 50s into execution (Vercel hobby = 60s)

const SEARCH_TYPES = [
  "national_park", "campground", "hiking_area", "beach",
  "wildlife_refuge", "botanical_garden",
  "historical_landmark", "museum", "art_gallery",
  "cultural_center", "performing_arts_theater",
  "tourist_attraction", "amusement_park", "zoo", "aquarium",
  "observation_deck", "stadium",
  "train_station", "ferry_terminal",
  "cemetery", "city_hall", "fire_station", "library", "park",
  "church", "hindu_temple", "mosque", "synagogue", "airport",
];

const TYPE_TO_CATEGORY = {
  national_park: "nature", campground: "nature", hiking_area: "nature",
  beach: "nature", wildlife_refuge: "nature", botanical_garden: "nature",
  park: "nature", natural_feature: "nature",
  historical_landmark: "history", museum: "history", cemetery: "history",
  city_hall: "history", church: "history", synagogue: "history",
  art_gallery: "culture", cultural_center: "culture",
  performing_arts_theater: "culture", hindu_temple: "culture",
  mosque: "culture", library: "culture",
  stadium: "infrastructure", train_station: "infrastructure",
  ferry_terminal: "infrastructure", airport: "infrastructure",
  fire_station: "infrastructure",
  tourist_attraction: "weird_fun", amusement_park: "weird_fun",
  zoo: "weird_fun", aquarium: "weird_fun", observation_deck: "weird_fun",
};

const JUNK_TYPES = new Set([
  "gas_station", "convenience_store", "fast_food_restaurant",
  "restaurant", "cafe", "bar", "lodging", "hotel", "motel",
  "car_wash", "car_repair", "parking", "parking_lot",
  "atm", "bank", "pharmacy", "drugstore",
  "grocery_store", "supermarket", "shopping_mall",
  "department_store", "clothing_store", "furniture_store",
  "home_goods_store", "electronics_store", "hardware_store",
  "hair_salon", "beauty_salon", "spa", "gym", "fitness_center",
  "laundry", "post_office", "police", "fire_station", "hospital",
  "doctor", "dentist", "veterinary_care",
]);

const AGGREGATE_TYPE_NAMES = {
  church: "Church", hindu_temple: "Hindu Temple",
  mosque: "Mosque", synagogue: "Synagogue", airport: "Regional Airport",
};

const REGIONAL_BUDGET = {
  north_america: 0.73, europe: 0.14, australia: 0.04,
  southern_africa: 0.04, east_asia: 0.03, other: 0.02,
};

// ================================================================
// ROUTES — priority order
// ================================================================

const ROUTES = [
  // US Interstates
  { label: "I-95 Houlton to Miami",              from: "Houlton, ME",                 to: "Miami, FL",                          region: "north_america" },
  { label: "I-75 Sault Ste Marie to Miami",      from: "Sault Ste Marie, MI",         to: "Miami, FL",                          region: "north_america" },
  { label: "I-10 Jacksonville to Santa Monica",  from: "Jacksonville, FL",            to: "Santa Monica, CA",                   region: "north_america" },
  { label: "I-5 Blaine to San Ysidro",           from: "Blaine, WA",                  to: "San Ysidro, CA",                     region: "north_america" },
  { label: "I-40 Wilmington to Barstow",         from: "Wilmington, NC",              to: "Barstow, CA",                        region: "north_america" },
  { label: "I-35 Duluth to Laredo",              from: "Duluth, MN",                  to: "Laredo, TX",                         region: "north_america" },
  { label: "I-80 Teaneck to San Francisco",      from: "Teaneck, NJ",                 to: "San Francisco, CA",                  region: "north_america" },
  { label: "I-90 Boston to Seattle",             from: "Boston, MA",                  to: "Seattle, WA",                        region: "north_america" },
  { label: "I-85 Petersburg to Montgomery",      from: "Petersburg, VA",              to: "Montgomery, AL",                     region: "north_america" },
  { label: "I-65 Gary to Mobile",                from: "Gary, IN",                    to: "Mobile, AL",                         region: "north_america" },
  { label: "I-70 Baltimore to Cove Fort",        from: "Baltimore, MD",               to: "Cove Fort, UT",                      region: "north_america" },
  { label: "I-81 Dandridge to Watertown",        from: "Dandridge, TN",               to: "Watertown, NY",                      region: "north_america" },
  { label: "I-77 Cleveland to Columbia",         from: "Cleveland, OH",               to: "Columbia, SC",                       region: "north_america" },
  { label: "I-26 Kingsport to Charleston",       from: "Kingsport, TN",               to: "Charleston, SC",                     region: "north_america" },
  { label: "I-4 Daytona to Tampa",               from: "Daytona Beach, FL",           to: "Tampa, FL",                          region: "north_america" },
  { label: "I-64 Norfolk to St Louis",           from: "Norfolk, VA",                 to: "St. Louis, MO",                      region: "north_america" },
  { label: "I-20 Florence to Kent",              from: "Florence, SC",                to: "Kent, TX",                           region: "north_america" },
  { label: "I-24 Chattanooga to Paducah",        from: "Chattanooga, TN",             to: "Paducah, KY",                        region: "north_america" },
  { label: "I-15 Sweet Grass to San Diego",      from: "Sweet Grass, MT",             to: "San Diego, CA",                      region: "north_america" },
  { label: "I-55 Chicago to LaPlace",            from: "Chicago, IL",                 to: "LaPlace, LA",                        region: "north_america" },
  { label: "Trans-Canada Victoria to St Johns",  from: "Victoria, BC, Canada",        to: "St. John's, NL, Canada",             region: "north_america" },
  { label: "Hwy 401 Windsor to Montreal",        from: "Windsor, ON, Canada",         to: "Montreal, QC, Canada",               region: "north_america" },
  { label: "Hwy 400 Toronto to Sudbury",         from: "Toronto, ON, Canada",         to: "Sudbury, ON, Canada",                region: "north_america" },
  { label: "Hwy 417 Ottawa to Montreal",         from: "Ottawa, ON, Canada",          to: "Montreal, QC, Canada",               region: "north_america" },
  { label: "Sea-to-Sky Vancouver to Whistler",   from: "Vancouver, BC, Canada",       to: "Whistler, BC, Canada",               region: "north_america" },
  { label: "Hwy 15 Nogales to Mazatlan",         from: "Nogales, Mexico",             to: "Mazatlán, Mexico",                   region: "north_america" },
  { label: "Hwy 307 Cancun to Tulum",            from: "Cancún, Mexico",              to: "Tulum, Mexico",                      region: "north_america" },
  { label: "Hwy 200 Puerto Vallarta to Acapulco",from: "Puerto Vallarta, Mexico",     to: "Acapulco, Mexico",                   region: "north_america" },
  { label: "A1 Milan to Naples",                 from: "Milan, Italy",                to: "Naples, Italy",                      region: "europe" },
  { label: "Paris to Berlin",                    from: "Paris, France",               to: "Berlin, Germany",                    region: "europe" },
  { label: "London to Edinburgh",                from: "London, England",             to: "Edinburgh, Scotland",                region: "europe" },
  { label: "AP-7 Barcelona to Malaga",           from: "Barcelona, Spain",            to: "Málaga, Spain",                      region: "europe" },
  { label: "Hamburg to Munich",                  from: "Hamburg, Germany",            to: "Munich, Germany",                    region: "europe" },
  { label: "Malmo to Oslo",                      from: "Malmö, Sweden",               to: "Oslo, Norway",                       region: "europe" },
  { label: "Paris to Marseille",                 from: "Paris, France",               to: "Marseille, France",                  region: "europe" },
  { label: "Romantic Road Wurzburg to Fussen",   from: "Würzburg, Germany",           to: "Füssen, Germany",                    region: "europe" },
  { label: "A1 Lisbon to Porto",                 from: "Lisbon, Portugal",            to: "Porto, Portugal",                    region: "europe" },
  { label: "Faro to Lisbon",                     from: "Faro, Portugal",              to: "Lisbon, Portugal",                   region: "europe" },
  { label: "Split to Dubrovnik",                 from: "Split, Croatia",              to: "Dubrovnik, Croatia",                 region: "europe" },
  { label: "Salzburg to Munich",                 from: "Salzburg, Austria",           to: "Munich, Germany",                    region: "europe" },
  { label: "Amsterdam to Frankfurt",             from: "Amsterdam, Netherlands",      to: "Frankfurt, Germany",                 region: "europe" },
  { label: "Ring Road Reykjavik to Akureyri",    from: "Reykjavík, Iceland",          to: "Akureyri, Iceland",                  region: "europe" },
  { label: "NC500 Inverness to John o Groats",   from: "Inverness, Scotland",         to: "John o' Groats, Scotland",           region: "europe" },
  { label: "Sydney to Brisbane",                 from: "Sydney, NSW, Australia",      to: "Brisbane, QLD, Australia",           region: "australia" },
  { label: "Melbourne to Sydney",                from: "Melbourne, VIC, Australia",   to: "Sydney, NSW, Australia",             region: "australia" },
  { label: "Great Ocean Road",                   from: "Torquay, VIC, Australia",     to: "Allansford, VIC, Australia",         region: "australia" },
  { label: "Sydney to Melbourne Inland",         from: "Sydney, NSW, Australia",      to: "Melbourne, VIC, Australia",          region: "australia" },
  { label: "Brisbane to Cairns",                 from: "Brisbane, QLD, Australia",    to: "Cairns, QLD, Australia",             region: "australia" },
  { label: "Cape Town to Port Elizabeth",        from: "Cape Town, South Africa",     to: "Gqeberha, South Africa",             region: "southern_africa" },
  { label: "Johannesburg to Cape Town",          from: "Johannesburg, South Africa",  to: "Cape Town, South Africa",            region: "southern_africa" },
  { label: "Johannesburg to Kruger",             from: "Johannesburg, South Africa",  to: "Kruger National Park, South Africa", region: "southern_africa" },
  { label: "Windhoek to Swakopmund",             from: "Windhoek, Namibia",           to: "Swakopmund, Namibia",                region: "southern_africa" },
  { label: "Kasane to Victoria Falls",           from: "Kasane, Botswana",            to: "Victoria Falls, Zimbabwe",           region: "southern_africa" },
  { label: "Tokyo to Osaka",                     from: "Tokyo, Japan",                to: "Osaka, Japan",                       region: "east_asia" },
  { label: "Seoul to Busan",                     from: "Seoul, South Korea",          to: "Busan, South Korea",                 region: "east_asia" },
  { label: "Jeju Coastal Road",                  from: "Jeju City, South Korea",      to: "Seogwipo, South Korea",              region: "east_asia" },
  { label: "Taipei to Kenting",                  from: "Taipei, Taiwan",              to: "Kenting, Taiwan",                    region: "east_asia" },
  { label: "Onomichi to Imabari Shimanami Kaido",from: "Onomichi, Japan",             to: "Imabari, Japan",                     region: "east_asia" },
  { label: "Auckland to Wellington",             from: "Auckland, New Zealand",       to: "Wellington, New Zealand",            region: "other" },
  { label: "Milford Road Te Anau to Milford Sound",from: "Te Anau, New Zealand",      to: "Milford Sound, New Zealand",         region: "other" },
  { label: "Queenstown to Franz Josef",          from: "Queenstown, New Zealand",     to: "Franz Josef, New Zealand",           region: "other" },
  { label: "Christchurch to Picton",             from: "Christchurch, New Zealand",   to: "Picton, New Zealand",                region: "other" },
  { label: "Thermal Explorer Auckland to Rotorua",from: "Auckland, New Zealand",      to: "Rotorua, New Zealand",               region: "other" },
  { label: "San Jose to Guanacaste",             from: "San Jose, Costa Rica",        to: "Liberia, Costa Rica",                region: "other" },
  { label: "San Jose to Manuel Antonio",         from: "San Jose, Costa Rica",        to: "Manuel Antonio, Costa Rica",         region: "other" },
  { label: "San Jose to Arenal Volcano",         from: "San Jose, Costa Rica",        to: "La Fortuna, Costa Rica",             region: "other" },
  { label: "El Calafate to El Chalten",          from: "El Calafate, Argentina",      to: "El Chaltén, Argentina",              region: "other" },
  { label: "Santiago to Valparaiso",             from: "Santiago, Chile",             to: "Valparaíso, Chile",                  region: "other" },
  { label: "Carretera Austral Chaiten to Coyhaique",from: "Chaitén, Chile",          to: "Coyhaique, Chile",                   region: "other" },
  { label: "Sacred Valley Cusco to Ollantaytambo",from: "Cusco, Peru",               to: "Ollantaytambo, Peru",                region: "other" },
  { label: "Rio to Sao Paulo",                   from: "Rio de Janeiro, Brazil",      to: "São Paulo, Brazil",                  region: "other" },
  { label: "Antalya to Fethiye",                 from: "Antalya, Turkey",             to: "Fethiye, Turkey",                    region: "other" },
  { label: "Muscat to Nizwa",                    from: "Muscat, Oman",                to: "Nizwa, Oman",                        region: "other" },
  { label: "Pittsboro to Charleston",            from: "Pittsboro, NC",               to: "Charleston, SC",                     region: "north_america" },
  { label: "Pittsboro to Richmond",              from: "Pittsboro, NC",               to: "Richmond, VA",                       region: "north_america" },
];

// ================================================================
// HELPERS
// ================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normSegment(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function makeCorridorId(from, to) {
  return `${normSegment(from)}--${normSegment(to)}`;
}

function downsamplePolyline(coords, intervalKm) {
  if (!coords?.length) return [];
  const points = [coords[0]];
  let accumulated = 0;
  for (let i = 1; i < coords.length; i++) {
    accumulated += haversine(coords[i - 1].lat, coords[i - 1].lng, coords[i].lat, coords[i].lng);
    if (accumulated >= intervalKm) { points.push(coords[i]); accumulated = 0; }
  }
  const last = coords[coords.length - 1];
  if (points[points.length - 1] !== last) points.push(last);
  return points;
}

function decodePolyline(encoded) {
  const points = []; let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

async function fetchDirectionsPolyline(from, to, mapsKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", from);
  url.searchParams.set("destination", to);
  url.searchParams.set("key", mapsKey);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.status !== "OK" || !data.routes?.[0]) throw new Error(`Directions: ${data.status}`);
  const route = data.routes[0];
  const legs = route.legs;
  return {
    coords: decodePolyline(route.overview_polyline.points),
    estimatedMiles: Math.round(legs.reduce((s, l) => s + l.distance.value, 0) / 1609.34),
    estimatedHours: parseFloat((legs.reduce((s, l) => s + l.duration.value, 0) / 3600).toFixed(1)),
    routeName: route.summary || `${from} to ${to}`,
  };
}

async function searchNearby(lat, lng, mapsKey) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": mapsKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.types,places.primaryType,places.location,places.rating,places.editorialSummary",
    },
    body: JSON.stringify({
      includedTypes: SEARCH_TYPES,
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: SEARCH_RADIUS_M } },
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Places ${res.status}: ${t.slice(0, 200)}`); }
  return (await res.json()).places || [];
}

function classifyPlace(types) {
  for (const t of (types || [])) { if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t]; }
  return "weird_fun";
}
function isJunk(types) { return (types || []).some((t) => JUNK_TYPES.has(t)); }

function projectOnSegment(plat, plng, alat, alng, blat, blng) {
  const dx = blng - alng, dy = blat - alat, lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { lat: alat, lng: alng };
  const t = Math.max(0, Math.min(1, ((plng - alng) * dx + (plat - alat) * dy) / lenSq));
  return { lat: alat + t * dy, lng: alng + t * dx };
}
function minDistToPolylineKm(lat, lng, coords) {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const p = projectOnSegment(lat, lng, coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng);
    const d = haversine(lat, lng, p.lat, p.lng);
    if (d < min) min = d;
  }
  return min;
}
function buildCumKm(coords) {
  const cum = [0];
  for (let i = 0; i < coords.length - 1; i++) cum.push(cum[i] + haversine(coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng));
  return cum;
}
function routePositionKm(lat, lng, coords, cumKm) {
  let min = Infinity, pos = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1].lng - coords[i].lng, dy = coords[i + 1].lat - coords[i].lat;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0 ? Math.max(0, Math.min(1, ((lng - coords[i].lng) * dx + (lat - coords[i].lat) * dy) / lenSq)) : 0;
    const proj = { lat: coords[i].lat + t * dy, lng: coords[i].lng + t * dx };
    const d = haversine(lat, lng, proj.lat, proj.lng);
    if (d < min) { min = d; pos = cumKm[i] + t * haversine(coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng); }
  }
  return pos;
}

function aggregateGenerics(goodPlaces, coords, cumKm) {
  const AGGREGATE_TYPES = new Set(Object.keys(AGGREGATE_TYPE_NAMES));
  const landmarks = [], byType = {};
  for (const { place, visible } of goodPlaces) {
    const pt = place.primaryType;
    if (pt && AGGREGATE_TYPES.has(pt)) {
      const lat = place.location?.latitude, lng = place.location?.longitude;
      const posKm = (lat != null && lng != null) ? routePositionKm(lat, lng, coords, cumKm) : 0;
      (byType[pt] = byType[pt] || []).push({ place, posKm, visible });
    } else { landmarks.push({ place, visible }); }
  }
  const genericItems = [];
  for (const [type, candidates] of Object.entries(byType)) {
    candidates.sort((a, b) => a.posKm - b.posKm);
    let i = 0;
    while (i < candidates.length) {
      let j = i;
      while (j < candidates.length && candidates[j].posKm - candidates[i].posKm <= GENERIC_CLUSTER_KM) j++;
      if (j - i >= GENERIC_CLUSTER_MIN) { genericItems.push({ name: AGGREGATE_TYPE_NAMES[type], category: TYPE_TO_CATEGORY[type] || "weird_fun" }); i = j; }
      else { for (let k = i; k < j; k++) landmarks.push({ place: candidates[k].place, visible: candidates[k].visible }); i = j; }
    }
  }
  return { landmarks, genericItems };
}

function templateDescription(place, from, to) {
  if (place.editorialSummary?.text) return place.editorialSummary.text;
  return `${place.displayName.text} is a notable landmark along the route between ${from.split(",")[0]} and ${to.split(",")[0]}.`;
}

// ================================================================
// DB HELPERS
// ================================================================

async function ensureRouteAndProgress(supabase, routeDef, mapsKey) {
  const { from, to, label, region } = routeDef;
  const corridorId = makeCorridorId(from, to);

  let { data: route } = await supabase
    .from("routes")
    .select("id, polyline, total_km, estimated_hours, regions")
    .eq("corridor_id", corridorId)
    .maybeSingle();

  if (!route) {
    const dir = await fetchDirectionsPolyline(from, to, mapsKey);
    const { data: newRoute, error } = await supabase
      .from("routes")
      .insert({
        corridor_id: corridorId, corridor_name: `${from} to ${to}`,
        route_from: from, route_to: to,
        route_summary: `${from} to ${to} via ${dir.routeName}`,
        highway_names: [dir.routeName],
        polyline: JSON.stringify(dir.coords),
        total_km: parseFloat((dir.estimatedMiles * 1.60934).toFixed(1)),
        estimated_hours: dir.estimatedHours,
        regions: [region], search_count: 0,
      })
      .select("id, polyline, total_km, estimated_hours, regions")
      .single();
    if (error) throw new Error(`Route insert: ${error.message}`);
    route = newRoute;
  } else if (!route.regions?.length) {
    await supabase.from("routes").update({ regions: [region] }).eq("id", route.id);
  }
  if (route) route.estimated_miles = (route.total_km || 0) / 1.60934;

  let { data: progress } = await supabase
    .from("crawler_progress")
    .select("*")
    .eq("route_id", route.id)
    .maybeSingle();

  if (!progress) {
    const totalKm = route.estimated_miles ? parseFloat((route.estimated_miles * 1.60934).toFixed(1)) : null;
    const { data: newProgress, error } = await supabase
      .from("crawler_progress")
      .insert({ route_id: route.id, region, total_km: totalKm, status: "queued" })
      .select("*").single();
    if (error) throw new Error(`Progress insert: ${error.message}`);
    progress = newProgress;
  }
  return { route, progress };
}

// ================================================================
// CRAWL ONE ROUTE
// ================================================================

async function crawlRoute(supabase, routeDef, mapsKey, samplesRemaining, startTime) {
  const { from, to, label, region } = routeDef;
  const { route, progress } = await ensureRouteAndProgress(supabase, routeDef, mapsKey);

  if (progress.status === "complete") return { samplesUsed: 0, skipped: true };

  let coords;
  try { coords = JSON.parse(route.polyline); } catch { return { samplesUsed: 0, skipped: true }; }
  if (!coords?.length) return { samplesUsed: 0, skipped: true };

  const samplePoints = downsamplePolyline(coords, SAMPLE_INTERVAL_KM);
  const totalSamples = samplePoints.length;
  const startIndex   = progress.sample_index || 0;

  if (startIndex >= totalSamples) {
    await supabase.from("crawler_progress").update({ status: "complete", updated_at: new Date().toISOString() }).eq("id", progress.id);
    return { samplesUsed: 0, skipped: true };
  }

  // Load existing place_ids
  const seenIds = new Set();
  const { data: existingItems } = await supabase
    .from("route_items").select("google_place_id").eq("route_id", route.id).not("google_place_id", "is", null);
  for (const i of existingItems || []) seenIds.add(i.google_place_id);

  await supabase.from("crawler_progress").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", progress.id);

  // Phase 1: collect raw places
  let samplesUsed = 0, currentIndex = startIndex;
  const rawPlaces = [];

  for (let i = startIndex; i < totalSamples; i++) {
    if (samplesRemaining <= 0) break;
    if (Date.now() - startTime > MAX_RUN_MS) break;

    const pt = samplePoints[i];
    let places = [];
    try {
      places = await searchNearby(pt.lat, pt.lng, mapsKey);
      samplesUsed++; samplesRemaining--;
    } catch (e) {
      await supabase.from("crawler_progress").update({ status: "error", error_message: e.message, updated_at: new Date().toISOString() }).eq("id", progress.id);
      break;
    }

    for (const place of places) {
      if (!place.id || seenIds.has(place.id)) continue;
      seenIds.add(place.id);
      rawPlaces.push({ place, samplePt: pt });
    }
    currentIndex = i + 1;

    await supabase.from("crawler_progress").update({
      sample_index: currentIndex, last_lat: pt.lat, last_lng: pt.lng,
      last_crawled_at: new Date().toISOString(),
      first_crawled_at: progress.first_crawled_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", progress.id);

    await sleep(200);
  }

  // Phase 2: distance filter
  const cumKm = buildCumKm(coords);
  let distRejected = 0;
  const nearPlaces = [];
  for (const { place } of rawPlaces) {
    const lat = place.location?.latitude, lng = place.location?.longitude;
    if (lat == null || lng == null) { distRejected++; continue; }
    const distKm = minDistToPolylineKm(lat, lng, coords);
    if (distKm > TRIVIA_DIST_KM) { distRejected++; continue; }
    nearPlaces.push({ place, visible: distKm <= VISIBLE_DIST_KM });
  }

  // Phase 3: quality filter
  let qualRejected = 0;
  const goodPlaces = nearPlaces.filter(({ place }) => {
    if (!place.displayName?.text) { qualRejected++; return false; }
    if (isJunk(place.types)) { qualRejected++; return false; }
    if (place.rating != null && place.rating < MIN_RATING) { qualRejected++; return false; }
    return true;
  });

  // Phase 4: aggregate generics
  const { landmarks, genericItems: aggregatedGenerics } = aggregateGenerics(goodPlaces, coords, cumKm);

  // Phase 5: insert rows
  const landmarkRows = landmarks.map(({ place, visible }) => ({
    route_id: route.id, name: place.displayName.text,
    category: classifyPlace(place.types), tier: "listed",
    route_description: templateDescription(place, from, to),
    visible_from_highway: visible ?? true, source: "crawler",
    description_quality: place.editorialSummary?.text ? "editorial" : "template",
    google_place_id: place.id,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
  }));
  const genericRows = aggregatedGenerics.map((g) => ({
    route_id: route.id, name: g.name, category: g.category, tier: "generic",
    route_description: `${g.name}s are a common sight along this route.`,
    visible_from_highway: true, source: "crawler", description_quality: "template",
    google_place_id: null, latitude: null, longitude: null,
  }));
  const allRows = [...landmarkRows, ...genericRows];
  let itemsAdded = 0;
  if (allRows.length > 0) {
    const { error } = await supabase.from("route_items").insert(allRows);
    if (!error) itemsAdded = allRows.length;
  }

  // Final progress update
  const finalStatus = currentIndex >= totalSamples ? "complete" : "queued";
  const crawledKm   = parseFloat(((currentIndex / totalSamples) * (route.total_km || 0)).toFixed(1));
  await supabase.from("crawler_progress").update({
    status: finalStatus, crawled_km: crawledKm,
    items_found:    (progress.items_found    || 0) + itemsAdded,
    items_rejected: (progress.items_rejected || 0) + (distRejected + qualRejected),
    updated_at: new Date().toISOString(),
  }).eq("id", progress.id);

  // Daily log
  if (samplesUsed > 0) {
    await supabase.rpc("upsert_crawler_daily_log", {
      p_searches_used: samplesUsed, p_items_added: itemsAdded,
      p_items_rejected: distRejected + qualRejected,
      p_api_cost_cents: samplesUsed * 3, p_region: region,
    }).catch(() => {});
  }

  return { samplesUsed, itemsAdded, label, finalStatus };
}

// ================================================================
// REPRIORITIZATION
// ================================================================

async function reprioritize(supabase) {
  await supabase.rpc("reprioritize_crawl_queue").catch(() => {});
}

// ================================================================
// MAIN HANDLER
// ================================================================

export async function GET(request) {
  // Vercel cron jobs send Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startTime = Date.now();
  const mapsKey   = process.env.GOOGLE_MAPS_KEY;
  if (!mapsKey) return NextResponse.json({ error: "Missing GOOGLE_MAPS_KEY" }, { status: 500 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Check daily usage
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLog } = await supabase
    .from("crawler_daily_log").select("searches_used").eq("log_date", today).maybeSingle();
  const usedToday = todayLog?.searches_used || 0;
  let remaining   = DAILY_LIMIT - usedToday;

  if (remaining <= 0) {
    return NextResponse.json({ message: "Daily limit reached", usedToday, limit: DAILY_LIMIT });
  }

  await reprioritize(supabase);

  // Per-region budgets
  const regionBudget = {}, regionUsed = {};
  for (const [r, pct] of Object.entries(REGIONAL_BUDGET)) {
    regionBudget[r] = Math.max(1, Math.floor(remaining * pct));
    regionUsed[r]   = 0;
  }

  const results  = [];
  let totalUsed  = 0;

  for (const routeDef of ROUTES) {
    if (Date.now() - startTime > MAX_RUN_MS) break;
    if (remaining - totalUsed <= 0) break;

    const reg          = routeDef.region;
    const regRemaining = (regionBudget[reg] || 0) - (regionUsed[reg] || 0);
    if (regRemaining <= 0) continue;

    const effectiveLimit = Math.min(regRemaining, remaining - totalUsed);

    try {
      const result = await crawlRoute(supabase, routeDef, mapsKey, effectiveLimit, startTime);
      if (!result.skipped) {
        results.push(result);
        totalUsed          += result.samplesUsed || 0;
        regionUsed[reg]     = (regionUsed[reg] || 0) + (result.samplesUsed || 0);
      }
    } catch (e) {
      results.push({ label: routeDef.label, error: e.message });
    }

    if (totalUsed >= remaining) break;
  }

  return NextResponse.json({
    ok: true,
    date: today,
    usedToday: usedToday + totalUsed,
    limit: DAILY_LIMIT,
    runMs: Date.now() - startTime,
    routes: results,
  });
}
