import { Loader } from "@googlemaps/js-api-loader";

// Singleton — shared by RouteMap and PlaceInput to prevent double script injection
let loaderInstance = null;

export function getGoogleMapsLoader() {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
      version: "weekly",
      libraries: ["places"],
    });
  }
  return loaderInstance;
}
