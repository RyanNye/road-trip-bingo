"use client";
import { useEffect, useRef, useCallback } from "react";
import { getGoogleMapsLoader } from "@/app/lib/googleMapsLoader";

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

/**
 * RouteMap — shows the Google Maps Directions driving route in gold,
 * allows drag-to-reroute, and fires onWaypointsChange with reverse-geocoded city names.
 *
 * Props:
 *   from           — origin string (e.g. "Chicago, IL")
 *   to             — destination string (e.g. "Santa Monica, CA")
 *   routeCoords    — array of {lat, lng} from Claude's route_coordinates (for immediate fitBounds)
 *   onWaypointsChange(string[]) — debounced callback when user adjusts the route
 */
export default function RouteMap({ from, to, routeCoords, onWaypointsChange }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const rendererRef = useRef(null);
  const debounceRef = useRef(null);
  const geocoderRef = useRef(null);

  const extractWaypoints = useCallback(
    async (directionsResult) => {
      if (!geocoderRef.current) return;

      const route = directionsResult?.routes?.[0];
      if (!route) {
        onWaypointsChange([]);
        return;
      }

      const viaWaypoints = route.legs?.flatMap((leg) => leg.via_waypoints || []) ?? [];

      if (viaWaypoints.length === 0) {
        onWaypointsChange([]);
        return;
      }

      const geocoder = geocoderRef.current;
      const names = await Promise.all(
        viaWaypoints.map(
          (latLng) =>
            new Promise((resolve) => {
              geocoder.geocode({ location: latLng }, (results, status) => {
                if (status !== "OK" || !results?.length) {
                  resolve(null);
                  return;
                }
                // Prefer locality > admin_area_level_2 > formatted_address
                const locality = results[0].address_components?.find((c) =>
                  c.types.includes("locality")
                );
                const admin2 = results[0].address_components?.find((c) =>
                  c.types.includes("administrative_area_level_2")
                );
                resolve(
                  locality?.long_name || admin2?.long_name || results[0].formatted_address || null
                );
              });
            })
        )
      );

      onWaypointsChange(names.filter(Boolean));
    },
    [onWaypointsChange]
  );

  useEffect(() => {
    if (!mapDivRef.current) return;
    let cancelled = false;

    const init = async () => {
      const loader = getGoogleMapsLoader();
      if (!loader) return; // no API key — skip map
      const google = await loader.load();
      if (cancelled) return;

      // Build initial bounds from Claude's routeCoords
      let center = { lat: 39.5, lng: -98.35 };
      let zoom = 4;
      let initialBounds = null;

      if (routeCoords?.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        routeCoords.forEach((c) => bounds.extend(c));
        initialBounds = bounds;
        center = bounds.getCenter().toJSON();
      }

      const map = new google.maps.Map(mapDivRef.current, {
        center,
        zoom,
        styles: MAP_STYLES,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });

      if (initialBounds) {
        map.fitBounds(initialBounds, { top: 40, right: 40, bottom: 40, left: 40 });
      }

      mapRef.current = map;

      const renderer = new google.maps.DirectionsRenderer({
        draggable: true,
        polylineOptions: {
          strokeColor: "#C4982A",
          strokeWeight: 5,
          strokeOpacity: 0.9,
        },
        suppressMarkers: false,
      });
      renderer.setMap(map);
      rendererRef.current = renderer;

      const geocoder = new google.maps.Geocoder();
      geocoderRef.current = geocoder;

      // Listen for drag-to-reroute
      renderer.addListener("directions_changed", () => {
        if (cancelled) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          if (!cancelled) {
            const result = renderer.getDirections();
            extractWaypoints(result);
          }
        }, 600);
      });

      // Request Directions
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: from,
          destination: to,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (cancelled) return;

          if (status === "OK") {
            renderer.setDirections(result);
          } else {
            // Fallback: draw a static polyline from routeCoords
            if (routeCoords?.length > 0) {
              new google.maps.Polyline({
                path: routeCoords,
                map,
                strokeColor: "#C4982A",
                strokeWeight: 4,
                strokeOpacity: 0.8,
              });
            }
          }
        }
      );
    };

    init().catch((err) => {
      if (!cancelled) console.error("[RouteMap] init error:", err);
    });

    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
      if (rendererRef.current) {
        rendererRef.current.setMap(null);
        rendererRef.current = null;
      }
      mapRef.current = null;
      geocoderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <div
      ref={mapDivRef}
      style={{
        width: "100%",
        height: 340,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        overflow: "hidden",
        background: "rgba(255,255,255,0.04)",
      }}
    />
  );
}
