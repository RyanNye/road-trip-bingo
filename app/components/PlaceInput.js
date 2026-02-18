"use client";
import { useEffect, useRef } from "react";
import { getGoogleMapsLoader } from "@/app/lib/googleMapsLoader";

/**
 * PlaceInput — text input with Google Places Autocomplete.
 * Falls back to a plain input if the Maps key is missing.
 *
 * Props mirror a standard <input>:
 *   value, onChange(string), placeholder, style, onKeyDown
 */
export default function PlaceInput({ value, onChange, placeholder, style, onKeyDown }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) return;
    const loader = getGoogleMapsLoader();
    if (!loader) return; // no API key — plain input fallback

    let cancelled = false;

    loader
      .load()
      .then((google) => {
        if (cancelled || !inputRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["geocode"],
          fields: ["formatted_address", "name"],
        });

        autocomplete.addListener("place_changed", () => {
          if (cancelled) return;
          const place = autocomplete.getPlace();
          const label = place?.formatted_address || place?.name;
          if (label) onChange(label);
        });
      })
      .catch(() => {
        // Silently fall back to plain input if Maps fails to load
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={style}
      onKeyDown={onKeyDown}
      autoComplete="off"
    />
  );
}
