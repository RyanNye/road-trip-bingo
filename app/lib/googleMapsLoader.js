import { Loader } from "@googlemaps/js-api-loader";

// Singleton — shared by RouteMap and PlaceInput to prevent double script injection
let loaderInstance = null;

// Returns null (instead of throwing) when the key is absent so callers can gracefully skip
export function getGoogleMapsLoader() {
  if (typeof window === "undefined") return null; // never run server-side
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) return null;
  if (!loaderInstance) {
    loaderInstance = new Loader({ apiKey, version: "weekly", libraries: ["places"] });
  }
  return loaderInstance;
}
