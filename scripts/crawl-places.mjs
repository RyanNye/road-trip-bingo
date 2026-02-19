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

const { createClient } = await import("@supabase/supabase-js");
const { haversine }    = await import("../lib/geo.js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAPS_KEY = process.env.GOOGLE_MAPS_KEY;
if (!MAPS_KEY) { console.error("Missing GOOGLE_MAPS_KEY"); process.exit(1); }

// ================================================================
// CONFIG
// ================================================================

const DAILY_LIMIT        = 200;   // Places API calls per day (fits $200 GCP free tier)
const SAMPLE_INTERVAL_KM = 30;    // km between polyline sample points
const SEARCH_RADIUS_M    = 25000; // 25 km radius per Places search
const MIN_RATING         = 3.5;   // filter out low-rated places

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
  // North America — US interstates
  { label: "I-95 Houlton to Miami",            from: "Houlton, ME",                     to: "Miami, FL",                             region: "north_america" },
  { label: "I-75 Sault Ste Marie to Miami",    from: "Sault Ste Marie, MI",             to: "Miami, FL",                             region: "north_america" },
  { label: "I-10 Jacksonville to Santa Monica",from: "Jacksonville, FL",                to: "Santa Monica, CA",                      region: "north_america" },
  { label: "I-5 Blaine to San Diego",          from: "Blaine, WA",                      to: "San Diego, CA",                         region: "north_america" },
  { label: "I-40 Wilmington to Barstow",       from: "Wilmington, NC",                  to: "Barstow, CA",                           region: "north_america" },
  { label: "I-35 Duluth to Laredo",            from: "Duluth, MN",                      to: "Laredo, TX",                            region: "north_america" },
  { label: "I-80 Teaneck to San Francisco",    from: "Teaneck, NJ",                     to: "San Francisco, CA",                     region: "north_america" },
  { label: "I-90 Boston to Seattle",           from: "Boston, MA",                      to: "Seattle, WA",                           region: "north_america" },
  { label: "I-85 Petersburg to Montgomery",    from: "Petersburg, VA",                  to: "Montgomery, AL",                        region: "north_america" },
  { label: "I-65 Gary to Mobile",              from: "Gary, IN",                        to: "Mobile, AL",                            region: "north_america" },
  { label: "I-70 Baltimore to Cove Fort",      from: "Baltimore, MD",                   to: "Cove Fort, UT",                         region: "north_america" },
  { label: "I-81 Dandridge to Watertown",      from: "Dandridge, TN",                   to: "Watertown, NY",                         region: "north_america" },
  { label: "I-26 Kingsport to Charleston",     from: "Kingsport, TN",                   to: "Charleston, SC",                        region: "north_america" },
  { label: "I-15 Sweet Grass to San Diego",    from: "Sweet Grass, MT",                 to: "San Diego, CA",                         region: "north_america" },
  { label: "I-55 Chicago to La Place",         from: "Chicago, IL",                     to: "La Place, LA",                          region: "north_america" },
  { label: "I-20 Florence to Kent",            from: "Florence, SC",                    to: "Kent, TX",                              region: "north_america" },
  { label: "I-4 Daytona to Tampa",             from: "Daytona Beach, FL",               to: "Tampa, FL",                             region: "north_america" },
  { label: "I-64 Norfolk to St Louis",         from: "Norfolk, VA",                     to: "St. Louis, MO",                         region: "north_america" },
  // North America — Canada
  { label: "Trans-Canada Victoria to St Johns",from: "Victoria, BC, Canada",            to: "St. John's, NL, Canada",                region: "north_america" },
  { label: "Hwy 401 Windsor to Montreal",      from: "Windsor, ON, Canada",             to: "Montreal, QC, Canada",                  region: "north_america" },
  { label: "Sea-to-Sky Vancouver to Whistler", from: "Vancouver, BC, Canada",           to: "Whistler, BC, Canada",                  region: "north_america" },
  { label: "Hwy 400 Toronto to Sudbury",       from: "Toronto, ON, Canada",             to: "Sudbury, ON, Canada",                   region: "north_america" },
  // North America — Mexico
  { label: "Hwy 307 Cancun to Tulum",          from: "Cancun, Mexico",                  to: "Tulum, Mexico",                         region: "north_america" },
  { label: "Hwy 15 Nogales to Mazatlan",       from: "Nogales, Mexico",                 to: "Mazatlan, Mexico",                      region: "north_america" },
  // Europe
  { label: "A1 Milan to Naples",               from: "Milan, Italy",                    to: "Naples, Italy",                         region: "europe" },
  { label: "Paris to Berlin",                  from: "Paris, France",                   to: "Berlin, Germany",                       region: "europe" },
  { label: "London to Edinburgh",              from: "London, England",                 to: "Edinburgh, Scotland",                   region: "europe" },
  { label: "Barcelona to Malaga",              from: "Barcelona, Spain",                to: "Malaga, Spain",                         region: "europe" },
  { label: "Hamburg to Munich",                from: "Hamburg, Germany",                to: "Munich, Germany",                       region: "europe" },
  { label: "Paris to Marseille",               from: "Paris, France",                   to: "Marseille, France",                     region: "europe" },
  { label: "Lisbon to Porto",                  from: "Lisbon, Portugal",                to: "Porto, Portugal",                       region: "europe" },
  { label: "Split to Dubrovnik",               from: "Split, Croatia",                  to: "Dubrovnik, Croatia",                    region: "europe" },
  { label: "Salzburg to Munich",               from: "Salzburg, Austria",               to: "Munich, Germany",                       region: "europe" },
  { label: "Amsterdam to Frankfurt",           from: "Amsterdam, Netherlands",          to: "Frankfurt, Germany",                    region: "europe" },
  { label: "Faro to Lisbon",                   from: "Faro, Portugal",                  to: "Lisbon, Portugal",                      region: "europe" },
  { label: "Malmo to Oslo",                    from: "Malmö, Sweden",                   to: "Oslo, Norway",                          region: "europe" },
  { label: "Wurzburg to Fussen Romantic Road", from: "Würzburg, Germany",               to: "Füssen, Germany",                       region: "europe" },
  // Australia
  { label: "Sydney to Brisbane",               from: "Sydney, NSW, Australia",          to: "Brisbane, QLD, Australia",              region: "australia" },
  { label: "Melbourne to Sydney",              from: "Melbourne, VIC, Australia",       to: "Sydney, NSW, Australia",                region: "australia" },
  { label: "Great Ocean Road",                 from: "Torquay, VIC, Australia",         to: "Allansford, VIC, Australia",            region: "australia" },
  { label: "Sydney to Melbourne Inland",       from: "Sydney, NSW, Australia",          to: "Melbourne, VIC, Australia",             region: "australia" },
  { label: "Brisbane to Cairns",               from: "Brisbane, QLD, Australia",        to: "Cairns, QLD, Australia",                region: "australia" },
  // Southern Africa
  { label: "Cape Town Garden Route to PE",     from: "Cape Town, South Africa",         to: "Port Elizabeth, South Africa",          region: "southern_africa" },
  { label: "Johannesburg to Cape Town",        from: "Johannesburg, South Africa",      to: "Cape Town, South Africa",               region: "southern_africa" },
  { label: "Johannesburg to Kruger",           from: "Johannesburg, South Africa",      to: "Kruger National Park, South Africa",    region: "southern_africa" },
  { label: "Windhoek to Swakopmund",           from: "Windhoek, Namibia",               to: "Swakopmund, Namibia",                   region: "southern_africa" },
  // East Asia
  { label: "Tokyo to Osaka",                   from: "Tokyo, Japan",                    to: "Osaka, Japan",                          region: "east_asia" },
  { label: "Seoul to Busan",                   from: "Seoul, South Korea",              to: "Busan, South Korea",                    region: "east_asia" },
  { label: "Taipei to Kenting",                from: "Taipei, Taiwan",                  to: "Kenting, Taiwan",                       region: "east_asia" },
  // Other
  { label: "Auckland to Wellington",           from: "Auckland, New Zealand",           to: "Wellington, New Zealand",               region: "other" },
  { label: "Milford Road Te Anau to Milford",  from: "Te Anau, New Zealand",            to: "Milford Sound, New Zealand",            region: "other" },
  { label: "Queenstown to Franz Josef",        from: "Queenstown, New Zealand",         to: "Franz Josef, New Zealand",              region: "other" },
  { label: "San Jose to Guanacaste",           from: "San Jose, Costa Rica",            to: "Liberia, Costa Rica",                   region: "other" },
  { label: "San Jose to Manuel Antonio",       from: "San Jose, Costa Rica",            to: "Manuel Antonio, Costa Rica",            region: "other" },
  { label: "El Calafate to El Chalten",        from: "El Calafate, Argentina",          to: "El Chalten, Argentina",                 region: "other" },
  { label: "Santiago to Valparaiso",           from: "Santiago, Chile",                 to: "Valparaíso, Chile",                     region: "other" },
  { label: "Antalya to Fethiye",               from: "Antalya, Turkey",                 to: "Fethiye, Turkey",                       region: "other" },
];

// ================================================================
// PLACES API TYPE MAPPING
// ================================================================

// Types passed to includedTypes in searchNearby.
// Uses only types confirmed in the Places API (New) type table.
const SEARCH_TYPES = [
  "national_park", "campground", "hiking_area", "beach",
  "wildlife_refuge", "botanical_garden",
  "historical_landmark", "museum", "art_gallery",
  "cultural_center", "performing_arts_theater",
  "tourist_attraction", "amusement_park", "zoo", "aquarium",
  "observation_deck", "stadium",
  "train_station", "ferry_terminal",
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

async function ensureRouteAndProgress(routeDef) {
  const { from, to, label, region } = routeDef;
  const corridorId = makeCorridorId(from, to);

  // Find or create routes row
  let { data: route } = await supabase
    .from("routes")
    .select("id, polyline, estimated_miles, estimated_hours, region")
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
        estimated_miles: dir.estimatedMiles,
        estimated_hours: dir.estimatedHours,
        region,
        search_count:    0,
      })
      .select("id, polyline, estimated_miles, estimated_hours, region")
      .single();

    if (error) throw new Error(`Failed to create route: ${error.message}`);
    route = newRoute;
    console.log(`    Created route: ${dir.estimatedMiles} mi / ${dir.estimatedHours} h`);
  } else if (!route.region) {
    await supabase.from("routes").update({ region }).eq("id", route.id);
  }

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

  const { route, progress } = await ensureRouteAndProgress(routeDef);

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
  const { data: existingItems } = await supabase
    .from("route_items")
    .select("google_place_id")
    .eq("route_id", route.id)
    .not("google_place_id", "is", null);

  const seenIds = new Set((existingItems || []).map((i) => i.google_place_id));

  let samplesUsed   = 0;
  let itemsAdded    = 0;
  let itemsRejected = 0;
  let currentIndex  = startIndex;

  for (let i = startIndex; i < totalSamples; i++) {
    if (samplesRemaining <= 0) {
      console.log(`    Budget exhausted at sample #${i + 1}`);
      break;
    }

    const pt = samplePoints[i];
    process.stdout.write(`    [${i + 1}/${totalSamples}] (${pt.lat.toFixed(3)}, ${pt.lng.toFixed(3)}) ... `);

    let places = [];
    try {
      if (!dryRun) {
        places = await searchNearby(pt.lat, pt.lng);
      }
      samplesUsed++;
      samplesRemaining--;
    } catch (e) {
      console.error(`\n    Places API error: ${e.message}`);
      if (!dryRun) {
        await supabase.from("crawler_progress").update({
          status:        "error",
          error_message: e.message,
          updated_at:    new Date().toISOString(),
        }).eq("id", progress.id);
      }
      break;
    }

    // Filter and prepare items
    const newItems = [];
    for (const place of places) {
      const placeId = place.id;
      if (!placeId || seenIds.has(placeId))         { itemsRejected++; continue; }
      if (!place.displayName?.text)                  { itemsRejected++; continue; }
      if (isJunk(place.types))                       { itemsRejected++; continue; }
      if (place.rating != null && place.rating < MIN_RATING) { itemsRejected++; continue; }

      seenIds.add(placeId);
      newItems.push({
        route_id:            route.id,
        name:                place.displayName.text,
        category:            classifyPlace(place.types),
        tier:                "listed",
        route_description:   templateDescription(place, from, to),
        visible_from_highway: true,
        source:              "google_places",
        description_quality: place.editorialSummary?.text ? "editorial" : "template",
        google_place_id:     placeId,
        latitude:            place.location?.latitude  ?? null,
        longitude:           place.location?.longitude ?? null,
      });
    }

    if (newItems.length && !dryRun) {
      const { error } = await supabase.from("route_items").insert(newItems);
      if (error) console.warn(`\n    Insert error: ${error.message}`);
      else itemsAdded += newItems.length;
    } else {
      itemsAdded += newItems.length; // dry-run count
    }

    console.log(`+${newItems.length} items`);
    currentIndex = i + 1;

    // Update progress row after every sample point
    if (!dryRun) {
      const crawledKm = parseFloat(
        ((currentIndex / totalSamples) * (route.estimated_miles * 1.60934 || 0)).toFixed(1)
      );
      await supabase.from("crawler_progress").update({
        sample_index:      currentIndex,
        crawled_km:        crawledKm,
        items_found:       (progress.items_found || 0) + itemsAdded,
        items_rejected:    (progress.items_rejected || 0) + itemsRejected,
        last_lat:          pt.lat,
        last_lng:          pt.lng,
        last_crawled_at:   new Date().toISOString(),
        first_crawled_at:  progress.first_crawled_at || new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      }).eq("id", progress.id);
    }

    await sleep(200); // pace requests; well under rate limits
  }

  // Set final status
  if (!dryRun) {
    const finalStatus = currentIndex >= totalSamples ? "complete" : "queued";
    await supabase.from("crawler_progress")
      .update({ status: finalStatus, updated_at: new Date().toISOString() })
      .eq("id", progress.id);
    if (finalStatus === "complete") console.log(`    Route fully crawled!`);
  }

  // Record in daily log
  if (!dryRun && samplesUsed > 0) {
    const { error } = await supabase.rpc("upsert_crawler_daily_log", {
      p_searches_used:  samplesUsed,
      p_items_added:    itemsAdded,
      p_items_rejected: itemsRejected,
      p_api_cost_cents: samplesUsed * 3, // $0.032/call ~ 3 cents
      p_region:         region,
    });
    if (error) console.warn(`    Daily log error: ${error.message}`);
  }

  console.log(`    Summary: +${itemsAdded} items, ${samplesUsed} API calls, ${itemsRejected} rejected`);
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

  // Check today's usage
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLog } = await supabase
    .from("crawler_daily_log")
    .select("searches_used")
    .eq("log_date", today)
    .single();

  const usedToday = todayLog?.searches_used || 0;
  let remaining   = dryRun ? 9999 : dailyLimit - usedToday;

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
