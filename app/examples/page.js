import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";

export const metadata = {
  title: "Road Trip Bingo Examples — Highway Bingo",
  description: "Browse free bingo cards for popular routes: Pacific Coast Highway, Route 66, London to Edinburgh, Sydney to Melbourne, and more.",
};

// The 10 featured routes for the examples page
const FEATURED_IDS = [
  "boston-ma--new-york-ny",
  "new-york-ny--washington-dc",
  "los-angeles-ca--san-francisco-ca",
  "nashville-tn--memphis-tn",
  "houston-tx--new-orleans-la",
  "charlotte-nc--atlanta-ga",
  "london-england--edinburgh-scotland",
  "cape-town-south-africa--johannesburg-south-africa",
  "sydney-nsw--melbourne-vic",
  "san-jose-costa-rica--la-fortuna-costa-rica",
];

const REGION_LABELS = {
  "boston-ma--new-york-ny":                              "Northeast US",
  "new-york-ny--washington-dc":                          "Northeast US",
  "los-angeles-ca--san-francisco-ca":                    "West Coast US",
  "nashville-tn--memphis-tn":                            "Southeast US",
  "houston-tx--new-orleans-la":                          "Gulf Coast US",
  "charlotte-nc--atlanta-ga":                            "Southeast US",
  "london-england--edinburgh-scotland":                  "Europe",
  "cape-town-south-africa--johannesburg-south-africa":   "Africa",
  "sydney-nsw--melbourne-vic":                           "Australia",
  "san-jose-costa-rica--la-fortuna-costa-rica":          "Latin America",
};

export default async function ExamplesPage() {
  const { data: routes } = await supabase
    .from("routes")
    .select("corridor_id, route_from, route_to, highway_names, route_summary")
    .in("corridor_id", FEATURED_IDS);

  // Keep the curated order
  const ordered = FEATURED_IDS
    .map((id) => (routes || []).find((r) => r.corridor_id === id))
    .filter(Boolean);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)",
      fontFamily: F, color: "#FFF9EE",
    }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)" }}>

        {/* Header */}
        <div style={{ paddingTop: 48, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#C4982A", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
            Free Examples
          </div>
          <h1 style={{
            fontFamily: SF, fontSize: "clamp(28px,5vw,46px)", fontWeight: 900, margin: "0 0 14px",
            background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Popular Routes
          </h1>
          <p style={{ fontSize: 16, color: "#8B7355", margin: 0, lineHeight: 1.65, maxWidth: 540 }}>
            Explore ten of our most-played routes. Each page has a full route guide,
            notable landmarks, and sample bingo items — free to browse, free to generate.
          </p>
        </div>

        {/* Route grid */}
        <div style={{ paddingTop: 36, paddingBottom: 60 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ordered.map((route) => {
              const from = route.route_from.split(",")[0].trim();
              const to   = route.route_to.split(",")[0].trim();
              const region = REGION_LABELS[route.corridor_id] || "";
              const ctaUrl = `/?from=${encodeURIComponent(route.route_from)}&to=${encodeURIComponent(route.route_to)}`;

              return (
                <div key={route.corridor_id} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 20,
                }}>
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {region && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#C4982A", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                        {region}
                        {route.highway_names?.length > 0 && (
                          <span style={{ color: "#6B5C48", marginLeft: 8 }}>
                            · {route.highway_names.join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ fontFamily: SF, fontSize: 20, fontWeight: 700, color: "#FFF9EE", marginBottom: 6 }}>
                      {from} → {to}
                    </div>
                    {route.route_summary && (
                      <div style={{
                        fontSize: 13, color: "#6B5C48", lineHeight: 1.55,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {route.route_summary}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    <Link href={`/routes/${route.corridor_id}`} style={{
                      padding: "8px 16px", background: "rgba(196,152,42,0.12)",
                      border: "1px solid rgba(196,152,42,0.3)", borderRadius: 8,
                      color: "#C4982A", fontSize: 13, fontWeight: 600, fontFamily: F,
                      textDecoration: "none", whiteSpace: "nowrap", textAlign: "center",
                    }}>
                      Route Guide
                    </Link>
                    <Link href={ctaUrl} style={{
                      padding: "8px 16px",
                      background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
                      borderRadius: 8, color: "#FFF", fontSize: 13, fontWeight: 700, fontFamily: F,
                      textDecoration: "none", whiteSpace: "nowrap", textAlign: "center",
                      boxShadow: "0 2px 10px rgba(196,152,42,0.25)",
                    }}>
                      Make Cards
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* More routes callout */}
          <div style={{
            marginTop: 36, padding: "24px 28px",
            background: "rgba(196,152,42,0.07)", border: "1px solid rgba(196,152,42,0.18)",
            borderRadius: 14, textAlign: "center",
          }}>
            <div style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "#FFF9EE", marginBottom: 8 }}>
              Don&#39;t see your route?
            </div>
            <p style={{ fontSize: 14, color: "#8B7355", margin: "0 0 18px", lineHeight: 1.65 }}>
              Highway Bingo generates custom cards for any driving route — just enter your start and end city.
            </p>
            <Link href="/" style={{
              display: "inline-block", padding: "12px 32px",
              background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
              borderRadius: 10, color: "#FFF", fontSize: 14, fontWeight: 700, fontFamily: F,
              textDecoration: "none", textTransform: "uppercase", letterSpacing: 1.5,
              boxShadow: "0 4px 16px rgba(196,152,42,0.3)",
            }}>
              Generate My Route
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
