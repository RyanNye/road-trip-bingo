import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";

// Revalidate every hour — cron runs once daily, this is plenty fresh
export const revalidate = 3600;

const REGION_META = {
  "north-america": {
    label: "North America",
    desc: "The most-driven routes across the US, Canada, and Mexico — ranked by Highway Bingo players.",
  },
  "europe": {
    label: "Europe",
    desc: "Top-ranked road trips across the UK, France, Germany, Italy, Spain, and beyond.",
  },
  "latin-america": {
    label: "Latin America",
    desc: "The most popular drives through Central and South America — jungles, coasts, and mountains.",
  },
  "africa": {
    label: "Africa",
    desc: "Epic African road trips ranked by players — from the Garden Route to safari corridors.",
  },
  "australia": {
    label: "Australia & Oceania",
    desc: "Top-ranked drives along the Great Ocean Road, the Nullarbor, and across New Zealand.",
  },
  "east-asia": {
    label: "East Asia",
    desc: "Most-played drives through Japan, China, South Korea, and Taiwan.",
  },
  "south-asia": {
    label: "South & SE Asia",
    desc: "Popular routes through India, Thailand, Vietnam, Indonesia, and surrounding countries.",
  },
  "west-asia": {
    label: "West Asia",
    desc: "Top road trips across Turkey, Jordan, UAE, and the wider Middle East.",
  },
};

export async function generateStaticParams() {
  return Object.keys(REGION_META).map((slug) => ({ region: slug }));
}

export async function generateMetadata({ params }) {
  const { region } = await params;
  const meta = REGION_META[region];
  if (!meta) return { title: "Not Found — Highway Bingo" };
  return {
    title: `Top 20 ${meta.label} Road Trips — Highway Bingo`,
    description: meta.desc,
  };
}

const MOVEMENT_ICON = { up: "↑", down: "↓", same: "—", new: "★" };
const MOVEMENT_COLOR = { up: "#4CAF50", down: "#E06B8F", same: "#6B5C48", new: "#C4982A" };

export default async function TopTripsRegionPage({ params }) {
  const { region } = await params;
  const meta = REGION_META[region];
  if (!meta) notFound();

  // Fetch today's snapshot for this region
  const { data: rankings } = await supabase
    .from("route_rankings")
    .select("rank, route_from, route_to, corridor_id, movement, search_count")
    .eq("region", region)
    .order("rank", { ascending: true })
    .limit(20);

  const hasData = rankings && rankings.length > 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)",
      fontFamily: F, color: "#FFF9EE",
    }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)" }}>

        {/* Back */}
        <div style={{ paddingTop: 24 }}>
          <Link href="/top-trips" style={{ fontSize: 13, color: "#A89270", textDecoration: "none" }}>
            ← Top Trips
          </Link>
        </div>

        {/* Header */}
        <div style={{ paddingTop: 28, paddingBottom: 32, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#C4982A", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
            Updated Daily
          </div>
          <h1 style={{
            fontFamily: SF, fontSize: "clamp(26px,5vw,42px)", fontWeight: 900, margin: "0 0 10px",
            background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Top 20 {meta.label} Road Trips
          </h1>
          <p style={{ fontSize: 15, color: "#8B7355", margin: 0, lineHeight: 1.65 }}>
            {meta.desc}
          </p>
        </div>

        {/* Rankings */}
        <div style={{ paddingTop: 32, paddingBottom: 60 }}>
          {!hasData ? (
            <div style={{
              padding: "40px 24px", textAlign: "center",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
            }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>🗺️</div>
              <div style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "#FFF9EE", marginBottom: 8 }}>
                Rankings coming soon
              </div>
              <p style={{ fontSize: 14, color: "#6B5C48", margin: "0 0 20px", lineHeight: 1.65 }}>
                We&#39;re collecting data for {meta.label} routes. Check back tomorrow for the first rankings!
              </p>
              <Link href="/" style={{
                display: "inline-block", padding: "10px 24px",
                background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
                borderRadius: 8, color: "#FFF", fontSize: 14, fontWeight: 700,
                fontFamily: F, textDecoration: "none",
              }}>
                Generate a Bingo Card
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {rankings.map((entry) => {
                const from = entry.route_from.split(",")[0].trim();
                const to   = entry.route_to.split(",")[0].trim();
                const mv   = entry.movement || "same";
                const ctaUrl = `/?from=${encodeURIComponent(entry.route_from)}&to=${encodeURIComponent(entry.route_to)}`;

                return (
                  <div key={entry.rank} style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "14px 18px",
                    background: entry.rank <= 3 ? "rgba(196,152,42,0.06)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${entry.rank <= 3 ? "rgba(196,152,42,0.15)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 10, transition: "border-color 0.15s",
                  }}>
                    {/* Rank number */}
                    <div style={{
                      fontFamily: SF, fontSize: entry.rank <= 3 ? 22 : 16, fontWeight: 800,
                      color: entry.rank <= 3 ? "#C4982A" : "#4A3728",
                      minWidth: 32, textAlign: "right", flexShrink: 0,
                    }}>
                      {entry.rank}
                    </div>

                    {/* Movement indicator */}
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: MOVEMENT_COLOR[mv] || MOVEMENT_COLOR.same,
                      minWidth: 14, flexShrink: 0,
                    }}>
                      {MOVEMENT_ICON[mv] || "—"}
                    </div>

                    {/* Route name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: SF, fontSize: 16, fontWeight: 700, color: "#FFF9EE", lineHeight: 1.2 }}>
                        {from} → {to}
                      </div>
                    </div>

                    {/* Play button */}
                    <Link href={entry.corridor_id ? `/routes/${entry.corridor_id}` : ctaUrl} style={{
                      padding: "7px 14px", fontSize: 12, fontWeight: 700, fontFamily: F,
                      background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
                      borderRadius: 7, color: "#FFF", textDecoration: "none",
                      flexShrink: 0, whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(196,152,42,0.2)",
                    }}>
                      Play →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA */}
          <div style={{ marginTop: 40, padding: "24px 28px", background: "rgba(196,152,42,0.07)", border: "1px solid rgba(196,152,42,0.18)", borderRadius: 14, textAlign: "center" }}>
            <div style={{ fontFamily: SF, fontSize: 17, fontWeight: 700, color: "#FFF9EE", marginBottom: 8 }}>
              Not on the list? Generate cards for any route.
            </div>
            <p style={{ fontSize: 13, color: "#8B7355", margin: "0 0 16px" }}>
              Enter any starting city and destination — we&#39;ll build custom cards in seconds.
            </p>
            <Link href="/" style={{
              display: "inline-block", padding: "11px 28px",
              background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
              borderRadius: 10, color: "#FFF", fontSize: 14, fontWeight: 700,
              fontFamily: F, textDecoration: "none", textTransform: "uppercase", letterSpacing: 1.5,
            }}>
              Generate My Cards
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
