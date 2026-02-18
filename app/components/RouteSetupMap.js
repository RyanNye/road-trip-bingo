"use client";
import { useEffect, useRef, useState } from "react";
import PlaceInput from "@/app/components/PlaceInput";
import { getGoogleMapsLoader } from "@/app/lib/googleMapsLoader";

const F = "'Source Sans 3', system-ui, sans-serif";

const IN = {
  width: "100%", padding: "14px 16px",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, color: "#FFF9EE", fontSize: 16, fontFamily: F,
  outline: "none", boxSizing: "border-box",
};

const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f5f0e8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a6652" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f0e8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e8dcc8" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#c4a97a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9dbe8" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a7c9e" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#5a4535" }] },
];

function extractCountryCode(address) {
  if (!address) return "us";
  const parts = address.split(",").map((s) => s.trim());
  const last = parts[parts.length - 1].toUpperCase().replace(/\.$/, "");
  if (last === "USA" || last.includes("UNITED STATES")) return "us";
  if (last === "CANADA") return "ca";
  if (last === "UK" || last.includes("UNITED KINGDOM") || last.includes("GREAT BRITAIN")) return "gb";
  if (last === "AUSTRALIA") return "au";
  if (last === "FRANCE") return "fr";
  if (last === "GERMANY") return "de";
  if (last === "MEXICO") return "mx";
  if (last === "NEW ZEALAND") return "nz";
  if (last === "JAPAN") return "jp";
  if (last === "ITALY") return "it";
  if (last === "SPAIN") return "es";
  if (last === "NETHERLANDS") return "nl";
  if (last === "BRAZIL") return "br";
  if (last === "IRELAND") return "ie";
  if (last === "PORTUGAL") return "pt";
  if (last === "SWEDEN") return "se";
  if (last === "NORWAY") return "no";
  if (last === "DENMARK") return "dk";
  if (last === "FINLAND") return "fi";
  if (last === "SWITZERLAND") return "ch";
  if (last === "AUSTRIA") return "at";
  if (last === "BELGIUM") return "be";
  if (last === "INDIA") return "in";
  if (last === "CHINA") return "cn";
  if (last === "SOUTH AFRICA") return "za";
  if (last === "ARGENTINA") return "ar";
  if (last === "SOUTH KOREA") return "kr";
  if (last === "THAILAND") return "th";
  if (last === "TURKEY" || last === "TÜRKİYE") return "tr";
  if (last === "GREECE") return "gr";
  return null;
}

// ── Helpers for async leg computation ────────────────────────────

// Reverse-geocode a lat/lng → "City, State" string or null
async function reverseGeocode(geocoder, latLng) {
  return new Promise((resolve) => {
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status !== "OK" || !results?.length) { resolve(null); return; }
      for (const type of ["locality", "administrative_area_level_2", "administrative_area_level_1"]) {
        const r = results.find((r) => r.types.includes(type));
        if (r) { resolve(r.formatted_address); return; }
      }
      resolve(results[0].formatted_address);
    });
  });
}

// Sample overview_path at a fractional position (0–1) along the route
function coordAtFrac(routeCoords, frac) {
  const idx = Math.round(frac * (routeCoords.length - 1));
  return routeCoords[Math.min(Math.max(idx, 0), routeCoords.length - 1)];
}

const TARGET_LEG_SECONDS = 4 * 3600; // aim for ~4-hour legs

/**
 * Compute suggested legs for a long route.
 *
 * Rules:
 *  - Checked detours ("waypoints") are mandatory leg boundaries.
 *  - Unchecked detours only affect Google routing; the system ignores them
 *    when deciding where to split legs.
 *  - Any segment longer than TARGET_LEG_SECONDS is automatically subdivided
 *    using reverse-geocoded points sampled from the overview_path.
 */
async function computeSuggestedLegs(
  google, from, to, detours, detourWaypoints, googleLegs, routeCoords, totalSeconds
) {
  const validDetours = detours.filter(Boolean);

  // Cumulative drive time at each Google-leg boundary
  // googleLegs[i] ends at: detours[i] (if exists), otherwise `to`
  const cumTimes = [];
  let cum = 0;
  for (const leg of googleLegs) {
    cum += leg.duration.value;
    cumTimes.push(cum);
  }

  // All user-defined points with cumulative time and mandatory flag
  const userPoints = [
    {
      time: 0,
      label: from,
      mandatory: true,
      flagCode: extractCountryCode(googleLegs[0].start_address) || "us",
    },
  ];
  validDetours.forEach((d, i) => {
    userPoints.push({
      time: cumTimes[i],
      label: d,
      mandatory: !!detourWaypoints[i],
      flagCode: extractCountryCode(d) || "us",
    });
  });
  userPoints.push({
    time: totalSeconds,
    label: to,
    mandatory: true,
    flagCode: extractCountryCode(googleLegs[googleLegs.length - 1].end_address) || "us",
  });

  // Only mandatory points become leg boundaries
  const mandatory = userPoints.filter((p) => p.mandatory);

  const geocoder = new google.maps.Geocoder();
  const finalBoundaries = [];

  for (let i = 0; i < mandatory.length; i++) {
    finalBoundaries.push(mandatory[i]);

    if (i < mandatory.length - 1) {
      const segStart = mandatory[i];
      const segEnd = mandatory[i + 1];
      const segDuration = segEnd.time - segStart.time;

      if (segDuration > TARGET_LEG_SECONDS) {
        const numLegs = Math.ceil(segDuration / TARGET_LEG_SECONDS);
        // Add (numLegs - 1) intermediate break points
        for (let k = 1; k < numLegs; k++) {
          const targetTime = segStart.time + (segDuration * k) / numLegs;
          const frac = totalSeconds > 0 ? targetTime / totalSeconds : 0;
          const coord = coordAtFrac(routeCoords, frac);
          const cityName = await reverseGeocode(geocoder, coord);
          if (cityName) {
            finalBoundaries.push({
              time: targetTime,
              label: cityName,
              mandatory: false,
              flagCode: extractCountryCode(cityName) || "us",
            });
          }
        }
      }
    }
  }

  // Sort by time in case async geocodes arrived out of order
  finalBoundaries.sort((a, b) => a.time - b.time);

  if (finalBoundaries.length < 2) return null;

  return finalBoundaries.slice(0, -1).map((start, i) => {
    const end = finalBoundaries[i + 1];
    return {
      label: `Leg ${i + 1}: ${start.label.split(",")[0].trim()} → ${end.label.split(",")[0].trim()}`,
      from: start.label,
      to: end.label,
      origin_flag_code: start.flagCode,
      destination_flag_code: end.flagCode,
      waypoints: [],
    };
  });
}

async function buildRouteData(result, google, from, to, detours, detourWaypoints) {
  const route = result.routes?.[0];
  if (!route) return null;

  const legs = route.legs;
  const totalMeters = legs.reduce((s, l) => s + l.distance.value, 0);
  const totalSeconds = legs.reduce((s, l) => s + l.duration.value, 0);
  const estimatedMiles = Math.round(totalMeters / 1609.34);
  const estimatedHours = parseFloat((totalSeconds / 3600).toFixed(1));

  const routeCoords = route.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));

  const fromCity = from.split(",")[0].trim();
  const toCity = to.split(",")[0].trim();
  const routeName = `${fromCity} to ${toCity}`;

  const validDetours = detours.filter(Boolean);
  const viaText = validDetours.length
    ? " via " + validDetours.map((d) => d.split(",")[0].trim()).join(", ")
    : "";
  const routeSummary =
    `${from} to ${to}${viaText}. ` +
    `Approximately ${estimatedMiles} miles (${estimatedHours} hrs driving).`;

  // Include isWaypoint so the backend knows which stops are mandatory boundaries
  const majorWaypoints = validDetours.map((d, i) => {
    const parts = d.split(",").map((s) => s.trim());
    const name = parts
      .slice(0, 2)
      .join(", ")
      .replace(/\s*\d{5}(-\d{4})?\s*/g, "")
      .trim();
    const country = (extractCountryCode(d) || "us").toUpperCase();
    return { name, country, isWaypoint: !!detourWaypoints[i] };
  });

  const originFlag = extractCountryCode(legs[0].start_address) || "us";
  const destFlag = extractCountryCode(legs[legs.length - 1].end_address) || "us";

  // Auto-split any long route — regardless of whether detours were added
  const isLong = estimatedMiles > 300 || estimatedHours > 5;
  let suggestedLegs = null;
  if (isLong) {
    try {
      suggestedLegs = await computeSuggestedLegs(
        google, from, to, detours, detourWaypoints, legs, routeCoords, totalSeconds
      );
    } catch (e) {
      console.error("[buildRouteData] computeSuggestedLegs error:", e);
    }
  }

  return {
    from,
    to,
    route_name: routeName,
    route_summary: routeSummary,
    major_waypoints: majorWaypoints,
    route_coordinates: routeCoords,
    estimated_miles: estimatedMiles,
    estimated_hours: estimatedHours,
    origin_flag_code: originFlag,
    destination_flag_code: destFlag,
    suggested_legs: suggestedLegs,
  };
}

/**
 * RouteSetupMap — combined inputs + live Google Map for Page 1.
 *
 * Props:
 *   from, to         — controlled string values
 *   detours          — controlled array of strings
 *   setFrom, setTo   — state setters
 *   setDetours       — state setter
 *   onRouteChange(data|null) — fired whenever a valid route is drawn or cleared
 */
export default function RouteSetupMap({
  from, to, detours,
  setFrom, setTo, setDetours,
  onRouteChange,
}) {
  const mapDivRef = useRef(null);
  const googleRef = useRef(null);
  const serviceRef = useRef(null);
  const rendererRef = useRef(null);
  const debounceRef = useRef(null);
  const lastResultRef = useRef(null);    // cache last Directions result
  const buildIdRef = useRef(0);          // guards against stale async completions

  // Refs so async callbacks always read current values
  const fromRef = useRef(from);
  const toRef = useRef(to);
  const detoursRef = useRef(detours);
  const detourWaypointsRef = useRef([]);

  useEffect(() => { fromRef.current = from; }, [from]);
  useEffect(() => { toRef.current = to; }, [to]);
  useEffect(() => { detoursRef.current = detours; }, [detours]);

  // detourWaypoints mirrors detours — same length, managed locally
  const [detourWaypoints, setDetourWaypoints] = useState([]);
  useEffect(() => { detourWaypointsRef.current = detourWaypoints; }, [detourWaypoints]);

  // Reset waypoints when parent clears detours (e.g. reset())
  useEffect(() => {
    if (detours.length === 0) setDetourWaypoints([]);
  }, [detours.length]);

  // ── Initialize map once ───────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current) return;
    let cancelled = false;

    (async () => {
      const loader = getGoogleMapsLoader();
      if (!loader) return;
      const google = await loader.load();
      if (cancelled || !mapDivRef.current) return;

      googleRef.current = google;

      const map = new google.maps.Map(mapDivRef.current, {
        center: { lat: 39.5, lng: -98.35 },
        zoom: 4,
        styles: MAP_STYLES,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      const renderer = new google.maps.DirectionsRenderer({
        draggable: true,
        polylineOptions: { strokeColor: "#C4982A", strokeWeight: 5, strokeOpacity: 0.9 },
      });
      renderer.setMap(map);
      rendererRef.current = renderer;
      serviceRef.current = new google.maps.DirectionsService();

      // User dragged the route → rebuild route data from new result
      renderer.addListener("directions_changed", () => {
        if (cancelled) return;
        const result = renderer.getDirections();
        if (!result) return;
        lastResultRef.current = result;

        const myId = ++buildIdRef.current;
        buildRouteData(
          result,
          googleRef.current,
          fromRef.current,
          toRef.current,
          detoursRef.current,
          detourWaypointsRef.current
        )
          .then((data) => { if (!cancelled && buildIdRef.current === myId) onRouteChange(data); })
          .catch((e) => console.error("[RouteSetupMap] buildRouteData error:", e));
      });
    })().catch((e) => { if (!cancelled) console.error("[RouteSetupMap]", e); });

    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
      rendererRef.current?.setMap(null);
      rendererRef.current = null;
      googleRef.current = null;
      serviceRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-request directions when from/to/detours change ────────
  useEffect(() => {
    if (!from || !to) {
      try { if (rendererRef.current) rendererRef.current.setDirections({ routes: [] }); } catch (_) {}
      onRouteChange(null);
      return;
    }
    const google = googleRef.current;
    const svc = serviceRef.current;
    if (!google || !svc) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        svc.route(
          {
            origin: from,
            destination: to,
            waypoints: detours.filter(Boolean).map((d) => ({ location: d, stopover: true })),
            travelMode: "DRIVING",
          },
          (result, status) => {
            if (status === "OK" && rendererRef.current) {
              rendererRef.current.setDirections(result);
              // directions_changed fires → triggers buildRouteData
            } else {
              onRouteChange(null);
            }
          }
        );
      } catch (e) {
        console.error("[RouteSetupMap] Directions request failed:", e);
        onRouteChange(null);
      }
    }, 500);
  }, [from, to, detours]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rebuild leg structure when waypoints change (no re-fetch) ─
  useEffect(() => {
    if (!lastResultRef.current || !googleRef.current) return;
    const myId = ++buildIdRef.current;
    buildRouteData(
      lastResultRef.current,
      googleRef.current,
      fromRef.current,
      toRef.current,
      detoursRef.current,
      detourWaypoints
    )
      .then((data) => { if (buildIdRef.current === myId) onRouteChange(data); })
      .catch((e) => console.error("[RouteSetupMap] waypoint rebuild error:", e));
  }, [detourWaypoints]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Detour list helpers ───────────────────────────────────────
  const addDetour = () => {
    setDetours((p) => [...p, ""]);
    setDetourWaypoints((p) => [...p, false]);
  };
  const removeDetour = (i) => {
    setDetours((p) => p.filter((_, j) => j !== i));
    setDetourWaypoints((p) => p.filter((_, j) => j !== i));
  };
  const updateDetour = (i, val) => setDetours((p) => p.map((d, j) => (j === i ? val : d)));
  const toggleWaypoint = (i) => setDetourWaypoints((p) => p.map((w, j) => (j === i ? !w : w)));

  return (
    <div>
      {/* ── Inputs ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        <PlaceInput
          value={from}
          onChange={setFrom}
          placeholder="Starting point (e.g. Chicago, IL)"
          style={IN}
        />
        <PlaceInput
          value={to}
          onChange={setTo}
          placeholder="Destination (e.g. Santa Monica, CA)"
          style={IN}
        />
        {detours.map((d, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <PlaceInput
              value={d}
              onChange={(val) => updateDetour(i, val)}
              placeholder={`Detour stop ${i + 1}`}
              style={{ ...IN, flex: 1 }}
            />
            {/* Waypoint checkbox */}
            <label style={{
              display: "flex", alignItems: "center", gap: 5,
              color: detourWaypoints[i] ? "#C4982A" : "#6B5C48",
              fontSize: 12, fontWeight: 600, fontFamily: F,
              whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
              userSelect: "none",
            }}>
              <input
                type="checkbox"
                checked={!!detourWaypoints[i]}
                onChange={() => toggleWaypoint(i)}
                style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#C4982A" }}
              />
              waypoint?
            </label>
            <button
              onClick={() => removeDetour(i)}
              style={{
                flexShrink: 0, background: "none",
                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
                padding: "12px 14px", color: "#6B5C48", cursor: "pointer",
                fontSize: 14, fontFamily: F, lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addDetour}
          style={{
            alignSelf: "flex-start", background: "none",
            border: "1px solid rgba(196,152,42,0.3)", borderRadius: 8,
            padding: "8px 14px", color: "#C4982A", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: F,
          }}
        >
          + Add a detour
        </button>
      </div>

      {/* ── Map ── */}
      <div
        ref={mapDivRef}
        style={{
          width: "100%",
          height: "min(400px, 50vh)",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          overflow: "hidden",
          background: "rgba(255,255,255,0.04)",
        }}
      />
    </div>
  );
}
