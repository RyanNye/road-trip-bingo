/**
 * Google Places crawler for Highway Bingo.
 * Fills route_items with real landmarks from the Places API (New).
 *
 * Usage:
 *   node scripts/crawl-places.mjs                     # run daily budget across all regions
 *   node scripts/crawl-places.mjs --route "I-95"      # single route (partial label match)
 *   node scripts/crawl-places.mjs --dry-run           # print without writing to DB
 *   node scripts/crawl-places.mjs --limit 50          # override daily API call limit
 *
 * Requires in .env.local:
 *   GOOGLE_MAPS_KEY      (server key with Places API New + Directions API enabled)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env.local before any imports that read env vars
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(join(__dirname, "../.env.local"), "utf8");
  for (const line of env.split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0 && !line.trimStart().startsWith("#")) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  }
} catch { /* rely on environment */ }

// Parse --dry-run early so we can skip Supabase init when not needed
const _earlyArgs = process.argv.slice(2);
const _isDryRun  = _earlyArgs.includes("--dry-run");

const { haversine } = await import("../lib/geo.js");

let supabase = null;
if (!_isDryRun) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (not needed for --dry-run)");
    process.exit(1);
  }
  const { createClient } = await import("@supabase/supabase-js");
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const MAPS_KEY = process.env.GOOGLE_MAPS_KEY;
if (!MAPS_KEY) { console.error("Missing GOOGLE_MAPS_KEY"); process.exit(1); }

// ================================================================
// CONFIG
// ================================================================

const DAILY_LIMIT           = 190;  // Places API calls per day (safety buffer under GCP free tier)
const SAMPLE_INTERVAL_KM    = 15;   // km between polyline sample points
const SEARCH_RADIUS_M       = 25000; // 25 km radius per Places search
const MIN_RATING            = 3.5;  // filter out low-rated places
const VISIBLE_DIST_KM      = 1.2;  // 0.75 miles — bingo-eligible, visible_from_highway = true
const TRIVIA_DIST_KM       = 16.1; // 10 miles — stored for trivia/blurbs, visible_from_highway = false
const GENERIC_CLUSTER_MIN  = 3;    // 3+ of same type in one window → aggregate
const GENERIC_CLUSTER_KM   = 48;   // 30-mile window for clustering

const REGIONAL_BUDGET = {
  north_america:   0.73,
  europe:          0.14,
  australia:       0.04,
  southern_africa: 0.04,
  east_asia:       0.03,
  other:           0.02,
};

// ================================================================
// ROUTE PRIORITY LIST
// ================================================================

const ROUTES = [
  // ── US Interstates ──────────────────────────────────────────────────────────
  { label: "I-95 Houlton to Miami",              from: "Houlton, ME",                   to: "Miami, FL",                            region: "north_america" },
  { label: "I-75 Sault Ste Marie to Miami",      from: "Sault Ste Marie, MI",           to: "Miami, FL",                            region: "north_america" },
  { label: "I-10 Jacksonville to Santa Monica",  from: "Jacksonville, FL",              to: "Santa Monica, CA",                     region: "north_america" },
  { label: "I-5 Blaine to San Ysidro",           from: "Blaine, WA",                    to: "San Ysidro, CA",                       region: "north_america" },
  { label: "I-40 Wilmington to Barstow",         from: "Wilmington, NC",                to: "Barstow, CA",                          region: "north_america" },
  { label: "I-35 Duluth to Laredo",              from: "Duluth, MN",                    to: "Laredo, TX",                           region: "north_america" },
  { label: "I-80 Teaneck to San Francisco",      from: "Teaneck, NJ",                   to: "San Francisco, CA",                    region: "north_america" },
  { label: "I-90 Boston to Seattle",             from: "Boston, MA",                    to: "Seattle, WA",                          region: "north_america" },
  { label: "I-85 Petersburg to Montgomery",      from: "Petersburg, VA",                to: "Montgomery, AL",                       region: "north_america" },
  { label: "I-65 Gary to Mobile",                from: "Gary, IN",                      to: "Mobile, AL",                           region: "north_america" },
  { label: "I-70 Baltimore to Cove Fort",        from: "Baltimore, MD",                 to: "Cove Fort, UT",                        region: "north_america" },
  { label: "I-81 Dandridge to Watertown",        from: "Dandridge, TN",                 to: "Watertown, NY",                        region: "north_america" },
  { label: "I-77 Cleveland to Columbia",         from: "Cleveland, OH",                 to: "Columbia, SC",                         region: "north_america" },
  { label: "I-26 Kingsport to Charleston",       from: "Kingsport, TN",                 to: "Charleston, SC",                       region: "north_america" },
  { label: "I-4 Daytona to Tampa",               from: "Daytona Beach, FL",             to: "Tampa, FL",                            region: "north_america" },
  { label: "I-64 Norfolk to St Louis",           from: "Norfolk, VA",                   to: "St. Louis, MO",                        region: "north_america" },
  { label: "I-20 Florence to Kent",              from: "Florence, SC",                  to: "Kent, TX",                             region: "north_america" },
  { label: "I-24 Chattanooga to Paducah",        from: "Chattanooga, TN",               to: "Paducah, KY",                          region: "north_america" },
  { label: "I-15 Sweet Grass to San Diego",      from: "Sweet Grass, MT",               to: "San Diego, CA",                        region: "north_america" },
  { label: "I-55 Chicago to LaPlace",            from: "Chicago, IL",                   to: "LaPlace, LA",                          region: "north_america" },
  // ── Canada ───────────────────────────────────────────────────────────────────
  { label: "Trans-Canada Victoria to St Johns",  from: "Victoria, BC, Canada",          to: "St. John's, NL, Canada",               region: "north_america" },
  { label: "Hwy 401 Windsor to Montreal",        from: "Windsor, ON, Canada",           to: "Montreal, QC, Canada",                 region: "north_america" },
  { label: "Hwy 400 Toronto to Sudbury",         from: "Toronto, ON, Canada",           to: "Sudbury, ON, Canada",                  region: "north_america" },
  { label: "Hwy 417 Ottawa to Montreal",         from: "Ottawa, ON, Canada",            to: "Montreal, QC, Canada",                 region: "north_america" },
  { label: "Sea-to-Sky Vancouver to Whistler",   from: "Vancouver, BC, Canada",         to: "Whistler, BC, Canada",                 region: "north_america" },
  // ── Mexico ────────────────────────────────────────────────────────────────────
  { label: "Hwy 15 Nogales to Mazatlan",         from: "Nogales, Mexico",               to: "Mazatlán, Mexico",                     region: "north_america" },
  { label: "Hwy 307 Cancun to Tulum",            from: "Cancún, Mexico",                to: "Tulum, Mexico",                        region: "north_america" },
  { label: "Hwy 200 Puerto Vallarta to Acapulco",from: "Puerto Vallarta, Mexico",       to: "Acapulco, Mexico",                     region: "north_america" },
  // ── Europe ────────────────────────────────────────────────────────────────────
  { label: "A1 Milan to Naples",                 from: "Milan, Italy",                  to: "Naples, Italy",                        region: "europe" },
  { label: "Paris to Berlin",                    from: "Paris, France",                 to: "Berlin, Germany",                      region: "europe" },
  { label: "London to Edinburgh",                from: "London, England",               to: "Edinburgh, Scotland",                  region: "europe" },
  { label: "AP-7 Barcelona to Malaga",           from: "Barcelona, Spain",              to: "Málaga, Spain",                        region: "europe" },
  { label: "Hamburg to Munich",                  from: "Hamburg, Germany",              to: "Munich, Germany",                      region: "europe" },
  { label: "Malmo to Oslo",                      from: "Malmö, Sweden",                 to: "Oslo, Norway",                         region: "europe" },
  { label: "Paris to Marseille",                 from: "Paris, France",                 to: "Marseille, France",                    region: "europe" },
  { label: "Romantic Road Wurzburg to Fussen",   from: "Würzburg, Germany",             to: "Füssen, Germany",                      region: "europe" },
  { label: "A1 Lisbon to Porto",                 from: "Lisbon, Portugal",              to: "Porto, Portugal",                      region: "europe" },
  { label: "Faro to Lisbon",                     from: "Faro, Portugal",                to: "Lisbon, Portugal",                     region: "europe" },
  { label: "Split to Dubrovnik",                 from: "Split, Croatia",                to: "Dubrovnik, Croatia",                   region: "europe" },
  { label: "Salzburg to Munich",                 from: "Salzburg, Austria",             to: "Munich, Germany",                      region: "europe" },
  { label: "Amsterdam to Frankfurt",             from: "Amsterdam, Netherlands",        to: "Frankfurt, Germany",                   region: "europe" },
  { label: "Ring Road Reykjavik to Akureyri",    from: "Reykjavík, Iceland",            to: "Akureyri, Iceland",                    region: "europe" },
  { label: "NC500 Inverness to John o Groats",   from: "Inverness, Scotland",           to: "John o' Groats, Scotland",             region: "europe" },
  // ── Australia ─────────────────────────────────────────────────────────────────
  { label: "Sydney to Brisbane",                 from: "Sydney, NSW, Australia",        to: "Brisbane, QLD, Australia",             region: "australia" },
  { label: "Melbourne to Sydney",                from: "Melbourne, VIC, Australia",     to: "Sydney, NSW, Australia",               region: "australia" },
  { label: "Great Ocean Road",                   from: "Torquay, VIC, Australia",       to: "Allansford, VIC, Australia",           region: "australia" },
  { label: "Sydney to Melbourne Inland",         from: "Sydney, NSW, Australia",        to: "Melbourne, VIC, Australia",            region: "australia" },
  { label: "Brisbane to Cairns",                 from: "Brisbane, QLD, Australia",      to: "Cairns, QLD, Australia",               region: "australia" },
  // ── Southern Africa ───────────────────────────────────────────────────────────
  { label: "Cape Town to Port Elizabeth",        from: "Cape Town, South Africa",       to: "Gqeberha, South Africa",               region: "southern_africa" },
  { label: "Johannesburg to Cape Town",          from: "Johannesburg, South Africa",    to: "Cape Town, South Africa",              region: "southern_africa" },
  { label: "Johannesburg to Kruger",             from: "Johannesburg, South Africa",    to: "Kruger National Park, South Africa",   region: "southern_africa" },
  { label: "Windhoek to Swakopmund",             from: "Windhoek, Namibia",             to: "Swakopmund, Namibia",                  region: "southern_africa" },
  { label: "Kasane to Victoria Falls",           from: "Kasane, Botswana",              to: "Victoria Falls, Zimbabwe",             region: "southern_africa" },
  // ── East Asia ─────────────────────────────────────────────────────────────────
  { label: "Tokyo to Osaka",                     from: "Tokyo, Japan",                  to: "Osaka, Japan",                         region: "east_asia" },
  { label: "Seoul to Busan",                     from: "Seoul, South Korea",            to: "Busan, South Korea",                   region: "east_asia" },
  { label: "Jeju Coastal Road",                  from: "Jeju City, South Korea",        to: "Seogwipo, South Korea",                region: "east_asia" },
  { label: "Taipei to Kenting",                  from: "Taipei, Taiwan",                to: "Kenting, Taiwan",                      region: "east_asia" },
  { label: "Onomichi to Imabari Shimanami Kaido",from: "Onomichi, Japan",              to: "Imabari, Japan",                       region: "east_asia" },
  // ── New Zealand ───────────────────────────────────────────────────────────────
  { label: "Auckland to Wellington",             from: "Auckland, New Zealand",         to: "Wellington, New Zealand",              region: "other" },
  { label: "Milford Road Te Anau to Milford Sound",from: "Te Anau, New Zealand",        to: "Milford Sound, New Zealand",           region: "other" },
  { label: "Queenstown to Franz Josef",          from: "Queenstown, New Zealand",       to: "Franz Josef, New Zealand",             region: "other" },
  { label: "Christchurch to Picton",             from: "Christchurch, New Zealand",     to: "Picton, New Zealand",                  region: "other" },
  { label: "Thermal Explorer Auckland to Rotorua",from: "Auckland, New Zealand",        to: "Rotorua, New Zealand",                 region: "other" },
  // ── Central America ───────────────────────────────────────────────────────────
  { label: "San Jose to Guanacaste",             from: "San Jose, Costa Rica",          to: "Liberia, Costa Rica",                  region: "other" },
  { label: "San Jose to Manuel Antonio",         from: "San Jose, Costa Rica",          to: "Manuel Antonio, Costa Rica",           region: "other" },
  { label: "San Jose to Arenal Volcano",         from: "San Jose, Costa Rica",          to: "La Fortuna, Costa Rica",               region: "other" },
  // ── South America ─────────────────────────────────────────────────────────────
  { label: "El Calafate to El Chalten",          from: "El Calafate, Argentina",        to: "El Chaltén, Argentina",                region: "other" },
  { label: "Santiago to Valparaiso",             from: "Santiago, Chile",               to: "Valparaíso, Chile",                    region: "other" },
  { label: "Carretera Austral Chaiten to Coyhaique",from: "Chaitén, Chile",            to: "Coyhaique, Chile",                     region: "other" },
  { label: "Sacred Valley Cusco to Ollantaytambo",from: "Cusco, Peru",                 to: "Ollantaytambo, Peru",                  region: "other" },
  { label: "Rio to Sao Paulo",                   from: "Rio de Janeiro, Brazil",        to: "São Paulo, Brazil",                    region: "other" },
  // ── Middle East ───────────────────────────────────────────────────────────────
  { label: "Antalya to Fethiye",                 from: "Antalya, Turkey",               to: "Fethiye, Turkey",                      region: "other" },
  { label: "Muscat to Nizwa",                    from: "Muscat, Oman",                  to: "Nizwa, Oman",                          region: "other" },
  // ── Legacy Pittsboro routes ───────────────────────────────────────────────────
  { label: "Pittsboro to Charleston",            from: "Pittsboro, NC",                 to: "Charleston, SC",                       region: "north_america" },
  { label: "Pittsboro to Richmond",              from: "Pittsboro, NC",                 to: "Richmond, VA",                         region: "north_america" },
];

// ================================================================
// PLACES API TYPE MAPPING
// ================================================================

// Types passed to includedTypes in searchNearby.
// Uses only types confirmed in the Places API (New) type table.
const SEARCH_TYPES = [
  // Landmark types — kept as individual "listed" items
  "national_park", "campground", "hiking_area", "beach",
  "wildlife_refuge", "botanical_garden",
  "historical_landmark", "museum", "art_gallery",
  "cultural_center", "performing_arts_theater",
  "tourist_attraction", "amusement_park", "zoo", "aquarium",
  "observation_deck", "stadium",
  "train_station", "ferry_terminal",
  "cemetery", "city_hall", "fire_station", "library", "park",
  // Generic roadside types — aggregated if 3+ per 30-mile stretch
  "church", "hindu_temple", "mosque", "synagogue", "airport",
];

const TYPE_TO_CATEGORY = {
  national_park:            "nature",
  campground:               "nature",
  hiking_area:              "nature",
  beach:                    "nature",
  wildlife_refuge:          "nature",
  botanical_garden:         "nature",
  park:                     "nature",
  natural_feature:          "nature",
  historical_landmark:      "history",
  museum:                   "history",
  monument:                 "history",
  cemetery:                 "history",
  church:                   "history",
  art_gallery:              "culture",
  cultural_center:          "culture",
  performing_arts_theater:  "culture",
  stadium:                  "infrastructure",
  train_station:            "infrastructure",
  ferry_terminal:           "infrastructure",
  bridge:                   "infrastructure",
  dam:                      "infrastructure",
  tourist_attraction:       "weird_fun",
  amusement_park:           "weird_fun",
  zoo:                      "weird_fun",
  aquarium:                 "weird_fun",
  observation_deck:         "weird_fun",
  airport:                  "infrastructure",
  church:                   "history",
  hindu_temple:             "culture",
  mosque:                   "culture",
  synagogue:                "history",
  cemetery:                 "history",
  city_hall:                "history",
  fire_station:             "infrastructure",
  library:                  "culture",
  park:                     "nature",
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

// Downsample a polyline to one point every intervalKm
function downsamplePolyline(coords, intervalKm) {
  if (!coords?.length) return [];
  const points = [coords[0]];
  let accumulated = 0;
  for (let i = 1; i < coords.length; i++) {
    accumulated += haversine(
      coords[i - 1].lat, coords[i - 1].lng,
      coords[i].lat,     coords[i].lng
    );
    if (accumulated >= intervalKm) {
      points.push(coords[i]);
      accumulated = 0;
    }
  }
  const last = coords[coords.length - 1];
  if (points[points.length - 1] !== last) points.push(last);
  return points;
}

// Decode a Google encoded polyline string into [{lat, lng}]
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
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

// Fetch a driving route from Google Directions API and return coords + stats
async function fetchDirectionsPolyline(from, to) {
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", from);
  url.searchParams.set("destination", to);
  url.searchParams.set("key", MAPS_KEY);

  const res  = await fetch(url.toString());
  const data = await res.json();

  if (data.status !== "OK" || !data.routes?.[0]) {
    throw new Error(`Directions API: ${data.status} (${from} -> ${to})`);
  }

  const route        = data.routes[0];
  const legs         = route.legs;
  const totalMeters  = legs.reduce((s, l) => s + l.distance.value, 0);
  const totalSeconds = legs.reduce((s, l) => s + l.duration.value, 0);

  return {
    coords:         decodePolyline(route.overview_polyline.points),
    estimatedMiles: Math.round(totalMeters / 1609.34),
    estimatedHours: parseFloat((totalSeconds / 3600).toFixed(1)),
    routeName:      route.summary || `${from} to ${to}`,
  };
}

// Call Google Places API (New) — one call per sample point
async function searchNearby(lat, lng) {
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "X-Goog-Api-Key":  MAPS_KEY,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.types",
          "places.primaryType",
          "places.location",
          "places.rating",
          "places.editorialSummary",
        ].join(","),
      },
      body: JSON.stringify({
        includedTypes:      SEARCH_TYPES,
        maxResultCount:     20,
        rankPreference:     "POPULARITY",
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: SEARCH_RADIUS_M,
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.places || [];
}

// Map a place's type list to our 6 categories
function classifyPlace(types) {
  for (const t of (types || [])) {
    if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t];
  }
  return "weird_fun";
}

// Return true if this place is junk (not highway-visible or interesting)
function isJunk(types) {
  return (types || []).some((t) => JUNK_TYPES.has(t));
}

// ================================================================
// DISTANCE + AGGREGATION + AI HELPERS
// ================================================================

// Types that get aggregated into a single generic item when clustered
const AGGREGATE_TYPE_NAMES = {
  church:       "Church",
  hindu_temple: "Hindu Temple",
  mosque:       "Mosque",
  synagogue:    "Synagogue",
  airport:      "Regional Airport",
};

// Project point P onto segment AB, return closest point on segment
function projectOnSegment(plat, plng, alat, alng, blat, blng) {
  const dx = blng - alng, dy = blat - alat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { lat: alat, lng: alng };
  const t = Math.max(0, Math.min(1, ((plng - alng) * dx + (plat - alat) * dy) / lenSq));
  return { lat: alat + t * dy, lng: alng + t * dx };
}

// Minimum haversine distance (km) from point to any segment of polyline
function minDistToPolylineKm(lat, lng, coords) {
  let min = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const p = projectOnSegment(lat, lng, coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng);
    const d = haversine(lat, lng, p.lat, p.lng);
    if (d < min) min = d;
  }
  return min;
}

// Build cumulative km array along polyline
function buildCumKm(coords) {
  const cum = [0];
  for (let i = 0; i < coords.length - 1; i++) {
    cum.push(cum[i] + haversine(coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng));
  }
  return cum;
}

// Approximate km from route start to where this point projects onto the polyline
function routePositionKm(lat, lng, coords, cumKm) {
  let min = Infinity, pos = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1].lng - coords[i].lng;
    const dy = coords[i + 1].lat - coords[i].lat;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq > 0 ? Math.max(0, Math.min(1, ((lng - coords[i].lng) * dx + (lat - coords[i].lat) * dy) / lenSq)) : 0;
    const proj = { lat: coords[i].lat + t * dy, lng: coords[i].lng + t * dx };
    const d = haversine(lat, lng, proj.lat, proj.lng);
    if (d < min) {
      min = d;
      const segLen = haversine(coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng);
      pos = cumKm[i] + t * segLen;
    }
  }
  return pos;
}

// Split places into individual landmarks vs. aggregated generic items.
// Any type in AGGREGATE_TYPE_NAMES with 3+ occurrences in a 30-mile window
// becomes a single generic item instead of individual entries.
function aggregateGenerics(goodPlaces, coords, cumKm) {
  const AGGREGATE_TYPES = new Set(Object.keys(AGGREGATE_TYPE_NAMES));
  const landmarks = [];
  const byType = {};

  for (const { place, visible } of goodPlaces) {
    const pt = place.primaryType;
    if (pt && AGGREGATE_TYPES.has(pt)) {
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;
      const posKm = (lat != null && lng != null) ? routePositionKm(lat, lng, coords, cumKm) : 0;
      (byType[pt] = byType[pt] || []).push({ place, posKm, visible });
    } else {
      landmarks.push({ place, visible });
    }
  }

  const genericItems = [];
  for (const [type, candidates] of Object.entries(byType)) {
    candidates.sort((a, b) => a.posKm - b.posKm);
    let i = 0;
    while (i < candidates.length) {
      let j = i;
      while (j < candidates.length && candidates[j].posKm - candidates[i].posKm <= GENERIC_CLUSTER_KM) j++;
      if (j - i >= GENERIC_CLUSTER_MIN) {
        genericItems.push({ name: AGGREGATE_TYPE_NAMES[type], category: TYPE_TO_CATEGORY[type] || "weird_fun" });
        i = j;
      } else {
        for (let k = i; k < j; k++) landmarks.push({ place: candidates[k].place, visible: candidates[k].visible });
        i = j;
      }
    }
  }
  return { landmarks, genericItems };
}

// Wildcard items — fun things to spot on any highway trip
const WILDCARD_POOL = [
  { name: "Out-of-state license plate",   description: "Spot a car with a license plate from a different state." },
  { name: "Car pulling a boat",           description: "A vehicle towing a boat on a trailer." },
  { name: "Oversized load truck",         description: "A truck carrying an oversized or wide load, often with escort vehicles." },
  { name: "RV with bikes on the back",    description: "A motorhome or camper with bicycles mounted on the rear rack." },
  { name: "Classic car (pre-1980)",       description: "A vintage automobile from 1980 or earlier on the open road." },
  { name: "Horse trailer",               description: "A trailer for horses, usually hitched to a pickup truck." },
  { name: "Motorcycle group (5+ riders)", description: "Five or more motorcycles riding together in formation." },
  { name: "Car with a kayak on top",      description: "A vehicle with a kayak or canoe strapped to the roof rack." },
  { name: "Convertible with top down",    description: "A convertible car cruising with the roof retracted." },
  { name: "Dog with head out the window", description: "A very happy dog enjoying the wind from a car window." },
  { name: "Double-decker car hauler",     description: "An auto-transport truck carrying cars stacked on two levels." },
  { name: "Police traffic stop",          description: "A police vehicle with lights on, pulled over on the shoulder." },
  { name: "Road construction crew",       description: "Workers actively doing road construction or maintenance." },
  { name: "Farm tractor on the road",     description: "A farm tractor driving on or crossing the highway." },
  { name: "Car with a Christmas tree",    description: "A vehicle with a Christmas tree strapped to the roof or sticking out of the trunk." },
];

function pickWildcards(count) {
  return [...WILDCARD_POOL].sort(() => Math.random() - 0.5).slice(0, count);
}

// Call Claude Haiku to generate a small pool of region-specific items for the DB.
// The website's generate-items API handles the final 70/20/10 mix per card.
async function generateAIItems(routeDef, existingCount) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { console.warn(`    Skipping AI items — no ANTHROPIC_API_KEY`); return []; }

  const needed = Math.max(8, 20 - Math.floor(existingCount * 0.1));
  const prompt = `You are building a road trip bingo card for a drive from ${routeDef.from} to ${routeDef.to}.

Generate exactly ${needed} bingo card items that passengers can see from inside the car WITHOUT exiting. Every item must:
- Be visible from the highway window, within 1 mile of the road
- Be realistic and common for this specific region and route
- NOT be a specific named landmark (those come from another source)

Focus on things passengers WILL see on this highway — the common roadside features that make bingo playable: water towers, grain silos, cell towers, church steeples, farm equipment, specific crop fields (corn, cotton, tobacco, soybeans), rest stop signs, weigh stations, regional wildlife (deer, hawks, vultures), terrain features (ridgelines, river crossings, valley views), billboard types, and truck types common to the region.

Respond with a JSON array only, no explanation:
[
  { "name": "Short item name (2-5 words)", "category": "nature|history|culture|infrastructure|weird_fun", "description": "One sentence: what it is and why you'd see it on this route." }
]`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) { console.warn(`    AI items API error: ${res.status}`); return []; }
    const data  = await res.json();
    const text  = data.content?.[0]?.text || "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) { console.warn(`    AI items: could not parse JSON response`); return []; }
    return JSON.parse(match[0]);
  } catch (e) {
    console.warn(`    AI items error: ${e.message}`);
    return [];
  }
}

// Build a template description for Option C (enrich with Claude later)
function templateDescription(place, from, to) {
  if (place.editorialSummary?.text) return place.editorialSummary.text;
  const fromCity = from.split(",")[0].trim();
  const toCity   = to.split(",")[0].trim();
  return `${place.displayName.text} is a notable landmark along the route between ${fromCity} and ${toCity}.`;
}

// ================================================================
// ENSURE ROUTE + PROGRESS ROWS EXIST
// ================================================================

async function ensureRouteAndProgress(routeDef, dryRun = false) {
  const { from, to, label, region } = routeDef;
  const corridorId = makeCorridorId(from, to);

  // In dry-run, skip DB entirely — just fetch the route from Directions API
  if (dryRun) {
    console.log(`    [DRY RUN] Fetching Directions for "${label}"...`);
    const dir = await fetchDirectionsPolyline(from, to);
    console.log(`    Route: ${dir.estimatedMiles} mi / ${dir.estimatedHours} h`);
    return {
      route: {
        id: "dry-run",
        polyline: JSON.stringify(dir.coords),
        estimated_miles: dir.estimatedMiles,
        estimated_hours: dir.estimatedHours,
        region,
      },
      progress: {
        id: "dry-run",
        status: "queued",
        sample_index: 0,
        items_found: 0,
        items_rejected: 0,
        first_crawled_at: null,
      },
    };
  }

  // Find or create routes row
  let { data: route } = await supabase
    .from("routes")
    .select("id, polyline, total_km, estimated_hours, regions")
    .eq("corridor_id", corridorId)
    .single();

  if (!route) {
    console.log(`    Fetching Directions for "${label}"...`);
    const dir = await fetchDirectionsPolyline(from, to);
    await sleep(300);

    const { data: newRoute, error } = await supabase
      .from("routes")
      .insert({
        corridor_id:     corridorId,
        corridor_name:   `${from} to ${to}`,
        route_from:      from,
        route_to:        to,
        route_summary:   `${from} to ${to} via ${dir.routeName}`,
        highway_names:   [dir.routeName],
        polyline:        JSON.stringify(dir.coords),
        total_km:        parseFloat((dir.estimatedMiles * 1.60934).toFixed(1)),
        estimated_hours: dir.estimatedHours,
        regions:         [region],
        search_count:    0,
      })
      .select("id, polyline, total_km, estimated_hours, regions")
      .single();

    if (error) throw new Error(`Failed to create route: ${error.message}`);
    route = newRoute;
    console.log(`    Created route: ${dir.estimatedMiles} mi / ${dir.estimatedHours} h`);
  } else if (!route.regions?.length) {
    await supabase.from("routes").update({ regions: [region] }).eq("id", route.id);
  }

  // Normalize total_km → estimated_miles for downstream use
  if (route) route.estimated_miles = (route.total_km || 0) / 1.60934;

  // Find or create crawler_progress row
  let { data: progress } = await supabase
    .from("crawler_progress")
    .select("*")
    .eq("route_id", route.id)
    .single();

  if (!progress) {
    const totalKm = route.estimated_miles
      ? parseFloat((route.estimated_miles * 1.60934).toFixed(1))
      : null;

    const { data: newProgress, error } = await supabase
      .from("crawler_progress")
      .insert({ route_id: route.id, region, total_km: totalKm, status: "queued" })
      .select("*")
      .single();

    if (error) throw new Error(`Failed to create crawler_progress: ${error.message}`);
    progress = newProgress;
    console.log(`    Progress row created (${totalKm ?? "?"}  km total)`);
  }

  return { route, progress };
}

// ================================================================
// CRAWL ONE ROUTE
// ================================================================

async function crawlRoute(routeDef, opts = {}) {
  const { dryRun = false } = opts;
  let { samplesRemaining } = opts;
  const { from, to, label, region } = routeDef;

  console.log(`\n  [${label}]`);

  const { route, progress } = await ensureRouteAndProgress(routeDef, dryRun);

  if (progress.status === "complete") {
    console.log(`    Already complete — skipping`);
    return { samplesUsed: 0 };
  }

  // Parse polyline
  let coords;
  try {
    coords = JSON.parse(route.polyline);
  } catch {
    console.warn(`    Could not parse polyline — skipping`);
    return { samplesUsed: 0 };
  }
  if (!coords?.length) {
    console.warn(`    Empty polyline — skipping`);
    return { samplesUsed: 0 };
  }

  const samplePoints  = downsamplePolyline(coords, SAMPLE_INTERVAL_KM);
  const totalSamples  = samplePoints.length;
  const startIndex    = progress.sample_index || 0;

  if (startIndex >= totalSamples) {
    if (!dryRun) {
      await supabase.from("crawler_progress")
        .update({ status: "complete", updated_at: new Date().toISOString() })
        .eq("id", progress.id);
    }
    console.log(`    All ${totalSamples} sample points done — marked complete`);
    return { samplesUsed: 0 };
  }

  console.log(`    ${totalSamples} total sample points, resuming from #${startIndex + 1}`);

  if (!dryRun) {
    await supabase.from("crawler_progress")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", progress.id);
  }

  // Load existing place_ids for this route to avoid duplicates
  const seenIds = new Set();
  if (!dryRun) {
    const { data: existingItems } = await supabase
      .from("route_items")
      .select("google_place_id")
      .eq("route_id", route.id)
      .not("google_place_id", "is", null);
    for (const i of existingItems || []) seenIds.add(i.google_place_id);
  }

  // ── PHASE 1: Collect all raw places from Places API ────────────────────────
  let samplesUsed  = 0;
  let currentIndex = startIndex;
  const rawPlaces  = []; // { place, samplePt }

  for (let i = startIndex; i < totalSamples; i++) {
    if (samplesRemaining <= 0) {
      console.log(`    Budget exhausted at sample #${i + 1}`);
      break;
    }

    const pt = samplePoints[i];
    process.stdout.write(`    [${i + 1}/${totalSamples}] (${pt.lat.toFixed(3)}, ${pt.lng.toFixed(3)}) ... `);

    let places = [];
    try {
      if (!dryRun) places = await searchNearby(pt.lat, pt.lng);
      samplesUsed++;
      samplesRemaining--;
    } catch (e) {
      console.error(`\n    Places API error: ${e.message}`);
      if (!dryRun) {
        await supabase.from("crawler_progress").update({
          status: "error", error_message: e.message, updated_at: new Date().toISOString(),
        }).eq("id", progress.id);
      }
      break;
    }

    let newRaw = 0;
    for (const place of places) {
      if (!place.id || seenIds.has(place.id)) continue;
      seenIds.add(place.id);
      rawPlaces.push({ place, samplePt: pt });
      newRaw++;
    }
    console.log(`${newRaw} raw`);
    currentIndex = i + 1;

    if (!dryRun) {
      await supabase.from("crawler_progress").update({
        sample_index:     currentIndex,
        last_lat:         pt.lat,
        last_lng:         pt.lng,
        last_crawled_at:  new Date().toISOString(),
        first_crawled_at: progress.first_crawled_at || new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }).eq("id", progress.id);
    }

    await sleep(200);
  }

  // ── PHASE 2: Distance filter — two tiers ──────────────────────────────────
  // Tier A (≤ 2 mi): bingo-eligible, visible_from_highway = true
  // Tier B (2–10 mi): stored for trivia/blurbs, visible_from_highway = false
  // Beyond 10 mi: rejected entirely
  const cumKm = buildCumKm(coords);
  let distRejected = 0;
  const nearPlaces = [];
  for (const { place, samplePt } of rawPlaces) {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (lat == null || lng == null) { distRejected++; continue; }
    const distKm = minDistToPolylineKm(lat, lng, coords);
    if (distKm > TRIVIA_DIST_KM) { distRejected++; continue; }
    nearPlaces.push({ place, samplePt, visible: distKm <= VISIBLE_DIST_KM });
  }
  const visibleCount = nearPlaces.filter((p) => p.visible).length;
  console.log(`    Distance filter: ${rawPlaces.length} → ${nearPlaces.length} kept (${distRejected} beyond 10 mi), ${visibleCount} bingo-visible, ${nearPlaces.length - visibleCount} trivia-only`);

  // ── PHASE 3: Quality filter ────────────────────────────────────────────────
  let qualRejected = 0;
  const goodPlaces = nearPlaces.filter(({ place }) => {
    if (!place.displayName?.text)                           { qualRejected++; return false; }
    if (isJunk(place.types))                                { qualRejected++; return false; }
    if (place.rating != null && place.rating < MIN_RATING) { qualRejected++; return false; }
    return true;
  });
  console.log(`    Quality filter: ${nearPlaces.length} → ${goodPlaces.length} (${qualRejected} junk/low-rated)`);

  // ── PHASE 4: Aggregate generics ───────────────────────────────────────────
  const { landmarks, genericItems: aggregatedGenerics } = aggregateGenerics(goodPlaces, coords, cumKm);
  console.log(`    Landmarks: ${landmarks.length}, Generics aggregated: ${aggregatedGenerics.length}`);

  // ── PHASE 5: Build DB rows and insert ────────────────────────────────────
  // AI items and wildcards are generated at card-generation time (generate-items API),
  // not during the crawl — so Claude tokens are never spent here.
  const landmarkRows = landmarks.map(({ place, visible }) => ({
    route_id:             route.id,
    name:                 place.displayName.text,
    category:             classifyPlace(place.types),
    tier:                 "listed",
    route_description:    templateDescription(place, from, to),
    visible_from_highway: visible ?? true,
    source:               "crawler",
    description_quality:  place.editorialSummary?.text ? "editorial" : "template",
    google_place_id:      place.id,
    latitude:             place.location?.latitude  ?? null,
    longitude:            place.location?.longitude ?? null,
  }));

  const genericRows = aggregatedGenerics.map((g) => ({
    route_id:             route.id,
    name:                 g.name,
    category:             g.category,
    tier:                 "generic",
    route_description:    `${g.name}s are a common sight along this route.`,
    visible_from_highway: true,
    source:               "crawler",
    description_quality:  "template",
    google_place_id:      null,
    latitude:             null,
    longitude:            null,
  }));

  const allRows   = [...landmarkRows, ...genericRows];
  let itemsAdded  = 0;
  const itemsRejected = distRejected + qualRejected;

  if (allRows.length > 0 && !dryRun) {
    const { error } = await supabase.from("route_items").insert(allRows);
    if (error) console.warn(`    Insert error: ${error.message}`);
    else itemsAdded = allRows.length;
  } else if (dryRun) {
    itemsAdded = allRows.length;
  }

  // ── Final progress update ─────────────────────────────────────────────────
  if (!dryRun) {
    const finalStatus = currentIndex >= totalSamples ? "complete" : "queued";
    const crawledKm   = parseFloat(((currentIndex / totalSamples) * (route.total_km || 0)).toFixed(1));
    await supabase.from("crawler_progress").update({
      status:         finalStatus,
      crawled_km:     crawledKm,
      items_found:    (progress.items_found    || 0) + itemsAdded,
      items_rejected: (progress.items_rejected || 0) + itemsRejected,
      updated_at:     new Date().toISOString(),
    }).eq("id", progress.id);
    if (finalStatus === "complete") console.log(`    Route fully crawled!`);
  }

  if (!dryRun && samplesUsed > 0) {
    const { error } = await supabase.rpc("upsert_crawler_daily_log", {
      p_searches_used:  samplesUsed,
      p_items_added:    itemsAdded,
      p_items_rejected: itemsRejected,
      p_api_cost_cents: samplesUsed * 3,
      p_region:         region,
    });
    if (error) console.warn(`    Daily log error: ${error.message}`);
  }

  console.log(`    Summary: +${itemsAdded} items (${landmarkRows.length} landmarks, ${genericRows.length} generics), ${samplesUsed} API calls, ${itemsRejected} rejected`);
  return { samplesUsed };
}

// ================================================================
// MAIN
// ================================================================

async function main() {
  const args        = process.argv.slice(2);
  const dryRun      = args.includes("--dry-run");
  const routeIdx    = args.indexOf("--route");
  const limitIdx    = args.indexOf("--limit");
  const routeFilter = routeIdx >= 0 ? args[routeIdx + 1]?.toLowerCase() : null;
  const limitOverride = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : null;

  const dailyLimit = limitOverride ?? DAILY_LIMIT;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  HIGHWAY BINGO -- Places Crawler`);
  if (dryRun) console.log(`  MODE: DRY RUN (no DB writes)`);
  console.log(`${"=".repeat(60)}`);

  // Run nightly reprioritization
  if (!dryRun) {
    const { error } = await supabase.rpc("reprioritize_crawl_queue");
    if (error) console.warn(`  reprioritize_crawl_queue failed: ${error.message}`);
    else console.log(`  Reprioritization complete`);
  }

  // Check today's usage (skipped in dry-run)
  let usedToday = 0;
  if (!dryRun) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayLog } = await supabase
      .from("crawler_daily_log")
      .select("searches_used")
      .eq("log_date", today)
      .single();
    usedToday = todayLog?.searches_used || 0;
  }
  let remaining = dryRun ? 9999 : dailyLimit - usedToday;

  console.log(`  Daily budget: ${usedToday} used / ${dailyLimit} limit (${remaining} remaining)\n`);

  if (remaining <= 0) {
    console.log(`  Daily limit reached. Nothing to do.`);
    return;
  }

  // Filter routes if --route flag given
  let routesToProcess = ROUTES;
  if (routeFilter) {
    routesToProcess = ROUTES.filter((r) =>
      r.label.toLowerCase().includes(routeFilter) ||
      r.from.toLowerCase().includes(routeFilter) ||
      r.to.toLowerCase().includes(routeFilter)
    );
    if (!routesToProcess.length) {
      console.error(`  No routes matched "${routeFilter}"`);
      process.exit(1);
    }
    console.log(`  Filtered to ${routesToProcess.length} route(s) matching "${routeFilter}"`);
  }

  // Per-region sample budgets
  const regionBudget = {};
  const regionUsed   = {};
  for (const [r, pct] of Object.entries(REGIONAL_BUDGET)) {
    regionBudget[r] = Math.max(1, Math.floor(remaining * pct));
    regionUsed[r]   = 0;
  }

  let totalUsed = 0;

  for (const routeDef of routesToProcess) {
    const reg = routeDef.region;
    const regRemaining    = (regionBudget[reg] || 0) - (regionUsed[reg] || 0);
    const globalRemaining = remaining - totalUsed;

    if (!routeFilter && (regRemaining <= 0 || globalRemaining <= 0)) continue;

    const effectiveLimit = routeFilter
      ? globalRemaining
      : Math.min(regRemaining, globalRemaining);

    const { samplesUsed } = await crawlRoute(routeDef, {
      dryRun,
      samplesRemaining: effectiveLimit,
    });

    totalUsed            += samplesUsed;
    regionUsed[reg]       = (regionUsed[reg] || 0) + samplesUsed;

    if (!routeFilter && totalUsed >= remaining) break;
    if (samplesUsed > 0) await sleep(500);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  DONE`);
  console.log(`  Total API calls today: ${usedToday + totalUsed} / ${dailyLimit}`);
  console.log(`  Breakdown:`);
  for (const [r, n] of Object.entries(regionUsed)) {
    if (n > 0) console.log(`    ${r.padEnd(20)} ${n}`);
  }
  console.log(`${"=".repeat(60)}\n`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
