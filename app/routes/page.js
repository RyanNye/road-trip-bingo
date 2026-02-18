import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";

export const metadata = {
  title: "All Routes — Highway Bingo",
  description: "Browse road trip bingo cards for popular driving routes across the US, Europe, and Australia.",
};

export default async function RoutesIndex() {
  const { data: routes } = await supabase
    .from("routes")
    .select("corridor_id, route_from, route_to, highway_names, route_summary, search_count")
    .order("search_count", { ascending: false });

  // Group by rough region based on common country/state patterns
  const us = (routes || []).filter((r) =>
    [r.route_from, r.route_to].some((s) =>
      /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)$/i.test(s)
    )
  );
  const international = (routes || []).filter((r) => !us.includes(r));

  const RouteCard = ({ route }) => (
    <Link
      href={`/routes/${route.corridor_id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: "16px 20px", transition: "border-color 0.15s",
      }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(196,152,42,0.4)"}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {route.highway_names?.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#C4982A", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                {route.highway_names.join(" · ")}
              </div>
            )}
            <div style={{ fontFamily: SF, fontSize: 17, fontWeight: 700, color: "#FFF9EE", marginBottom: 4, lineHeight: 1.2 }}>
              {route.route_from.split(",")[0].trim()} → {route.route_to.split(",")[0].trim()}
            </div>
            {route.route_summary && (
              <div style={{ fontSize: 13, color: "#6B5C48", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {route.route_summary}
              </div>
            )}
          </div>
          <div style={{ fontSize: 18, color: "#A89270", flexShrink: 0 }}>→</div>
        </div>
      </div>
    </Link>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)", fontFamily: F, color: "#FFF9EE" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)" }}>

        <div style={{ paddingTop: 24 }}>
          <Link href="/" style={{ fontSize: 13, color: "#A89270", textDecoration: "none" }}>← Highway Bingo</Link>
        </div>

        <div style={{ paddingTop: 32, paddingBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 style={{ fontFamily: SF, fontSize: "clamp(28px,5vw,42px)", fontWeight: 900, margin: "0 0 10px", background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Popular Routes
          </h1>
          <p style={{ fontSize: 15, color: "#8B7355", margin: 0, lineHeight: 1.6 }}>
            Browse bingo cards for {(routes || []).length} popular driving corridors — or{" "}
            <Link href="/" style={{ color: "#C4982A", textDecoration: "none" }}>enter any route</Link> to generate your own.
          </p>
        </div>

        {us.length > 0 && (
          <section style={{ paddingTop: 36 }}>
            <h2 style={{ fontFamily: SF, fontSize: 20, fontWeight: 700, margin: "0 0 16px", color: "#A89270", textTransform: "uppercase", letterSpacing: 2, fontSize: 12 }}>
              United States
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {us.map((r) => <RouteCard key={r.corridor_id} route={r} />)}
            </div>
          </section>
        )}

        {international.length > 0 && (
          <section style={{ paddingTop: 36, paddingBottom: 48 }}>
            <h2 style={{ fontFamily: SF, fontWeight: 700, margin: "0 0 16px", color: "#A89270", textTransform: "uppercase", letterSpacing: 2, fontSize: 12 }}>
              International
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {international.map((r) => <RouteCard key={r.corridor_id} route={r} />)}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
