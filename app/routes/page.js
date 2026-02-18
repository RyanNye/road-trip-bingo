import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AffiliateButtons from "@/app/components/AffiliateButtons";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";
const BF = "'Libre Baskerville', Georgia, serif";

const CATEGORY_EMOJI = {
  nature: "🌿", history: "🏛️", culture: "🎭",
  infrastructure: "🚧", vehicles: "🚗", weird_fun: "🤪",
};

export const metadata = {
  title: "Popular Routes — Highway Bingo",
  description: "The 20 most-searched road trip routes on Highway Bingo — with full route guides and sample bingo cards.",
};

function BingoPreview({ items }) {
  // 24 items + free square at center (index 12 in 0-based 5×5)
  const picked = items.slice(0, 24);
  const cells = [...picked.slice(0, 12), null, ...picked.slice(12)];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
      {cells.map((item, i) => (
        <div key={i} style={{
          aspectRatio: "1",
          border: `1.5px solid ${item === null ? "#999" : "#D4C5A9"}`,
          borderRadius: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 3, textAlign: "center",
          background: item === null ? "#f5ead0" : "white",
          position: "relative", overflow: "hidden",
        }}>
          {item === null ? (
            <>
              <span style={{ position: "absolute", fontSize: 26, color: "#FFD700", lineHeight: 1 }}>★</span>
              <span style={{ position: "relative", zIndex: 1, fontSize: 7, fontWeight: 700, color: "#333", fontFamily: BF, letterSpacing: 0.5 }}>FREE</span>
            </>
          ) : (
            <div style={{ fontSize: 8, fontWeight: 600, color: "#222", lineHeight: 1.25, fontFamily: BF }}>
              {item.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default async function RoutesIndex() {
  const { data: routes } = await supabase
    .from("routes")
    .select("id, corridor_id, route_from, route_to, highway_names, route_summary, search_count")
    .order("search_count", { ascending: false })
    .limit(20);

  const routeIds = (routes || []).map((r) => r.id);

  const [{ data: allBlurbs }, { data: allItems }] = await Promise.all([
    supabase
      .from("route_blurbs")
      .select("route_id, leg, description")
      .in("route_id", routeIds)
      .order("created_at"),
    supabase
      .from("route_items")
      .select("route_id, name, category")
      .in("route_id", routeIds)
      .neq("tier", "excluded"),
  ]);

  // Group blurbs and items by route_id
  const blurbsByRoute = {};
  for (const b of allBlurbs || []) {
    if (!blurbsByRoute[b.route_id]) blurbsByRoute[b.route_id] = [];
    blurbsByRoute[b.route_id].push(b);
  }
  const itemsByRoute = {};
  for (const item of allItems || []) {
    if (!itemsByRoute[item.route_id]) itemsByRoute[item.route_id] = [];
    itemsByRoute[item.route_id].push(item);
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)", fontFamily: F, color: "#FFF9EE" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)" }}>

        {/* Header */}
        <div style={{ paddingTop: 48, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 style={{ fontFamily: SF, fontSize: "clamp(28px,5vw,42px)", fontWeight: 900, margin: "0 0 12px", background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Popular Routes
          </h1>
          <p style={{ fontSize: 15, color: "#8B7355", margin: 0, lineHeight: 1.6 }}>
            The {(routes || []).length} most-searched driving corridors on Highway Bingo — full route guides and sample bingo cards included.{" "}
            <Link href="/" style={{ color: "#C4982A", textDecoration: "none" }}>Enter any route</Link> to generate your own.
          </p>
        </div>

        {/* Route entries */}
        <div style={{ paddingBottom: 60 }}>
          {(routes || []).map((route, idx) => {
            const fromCity = route.route_from.split(",")[0].trim();
            const toCity   = route.route_to.split(",")[0].trim();
            const highways = route.highway_names?.filter(Boolean) || [];
            const blurbs   = blurbsByRoute[route.id] || [];
            const items    = itemsByRoute[route.id] || [];
            const ctaUrl   = `/?from=${encodeURIComponent(route.route_from)}&to=${encodeURIComponent(route.route_to)}`;

            return (
              <article key={route.corridor_id} style={{ paddingTop: 52, paddingBottom: 52, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>

                {/* Rank + Route name */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                  <div style={{ fontFamily: SF, fontSize: 28, fontWeight: 900, color: idx < 3 ? "#C4982A" : "rgba(255,255,255,0.2)", flexShrink: 0, lineHeight: 1, paddingTop: 4 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {highways.length > 0 && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                        {highways.map((hw, i) => (
                          <span key={i} style={{ background: "rgba(196,152,42,0.15)", border: "1px solid rgba(196,152,42,0.3)", borderRadius: 5, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: "#C4982A", letterSpacing: 1, textTransform: "uppercase" }}>
                            {hw}
                          </span>
                        ))}
                      </div>
                    )}
                    <h2 style={{ fontFamily: SF, fontSize: "clamp(20px,3vw,28px)", fontWeight: 800, margin: "0 0 6px", color: "#FFF9EE", lineHeight: 1.2 }}>
                      <Link href={`/routes/${route.corridor_id}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {fromCity} → {toCity}
                      </Link>
                    </h2>
                    <div style={{ fontSize: 13, color: "#6B5C48", marginBottom: 12 }}>
                      {route.route_from} → {route.route_to}
                    </div>
                    {route.route_summary && (
                      <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.75, margin: 0 }}>
                        {route.route_summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Full blurb */}
                {blurbs.length > 0 && (
                  <div style={{ marginBottom: 32, marginLeft: 44 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#A89270", marginBottom: 16 }}>
                      Route Guide
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {blurbs.map((b, i) => (
                        <div key={i} style={{ borderLeft: "2px solid rgba(196,152,42,0.3)", paddingLeft: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#C4982A", marginBottom: 6 }}>
                            {b.leg}
                          </div>
                          <p style={{ fontSize: 14, color: "#D4C5A9", lineHeight: 1.8, margin: 0 }}>
                            {b.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample bingo card + CTA side by side */}
                <div style={{ marginLeft: 44, display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
                  {items.length >= 24 && (
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#A89270", marginBottom: 10 }}>
                        Sample Card
                      </div>
                      <div style={{ width: 220, border: "2px solid rgba(139,105,20,0.5)", borderRadius: 8, overflow: "hidden", background: "white" }}>
                        <div style={{ background: "linear-gradient(135deg,#7A5514,#C4982A)", padding: "7px 10px", textAlign: "center", fontFamily: SF, fontSize: 11, fontWeight: 800, color: "white", letterSpacing: 1 }}>
                          {fromCity.toUpperCase()} → {toCity.toUpperCase()}
                        </div>
                        <div style={{ padding: 6 }}>
                          <BingoPreview items={items} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#A89270", marginBottom: 10 }}>
                      {items.length > 0 ? `${items.length} route-specific items` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Link href={`/routes/${route.corridor_id}`} style={{
                        padding: "10px 20px", background: "rgba(196,152,42,0.1)",
                        border: "1px solid rgba(196,152,42,0.3)", borderRadius: 8,
                        color: "#C4982A", fontSize: 13, fontWeight: 600, fontFamily: F,
                        textDecoration: "none", whiteSpace: "nowrap",
                      }}>
                        Full Route Guide
                      </Link>
                      <Link href={ctaUrl} style={{
                        padding: "10px 20px",
                        background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
                        borderRadius: 8, color: "#FFF", fontSize: 13, fontWeight: 700, fontFamily: F,
                        textDecoration: "none", whiteSpace: "nowrap",
                        boxShadow: "0 2px 10px rgba(196,152,42,0.25)",
                      }}>
                        Make Cards →
                      </Link>
                    </div>
                  </div>
                </div>

              </article>
            );
          })}
        </div>

        <AffiliateButtons />

      </div>
    </div>
  );
}
