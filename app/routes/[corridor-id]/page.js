import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ── Shared styles (matching main app) ──────────────────────────
const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";
const BF = "'Libre Baskerville', Georgia, serif";

const CATEGORY_EMOJI = {
  nature: "🌿", history: "🏛️", culture: "🎭",
  infrastructure: "🚧", vehicles: "🚗", weird_fun: "🤪",
};
const CATEGORY_LABEL = {
  nature: "Nature", history: "History", culture: "Culture",
  infrastructure: "Infrastructure", vehicles: "Vehicles", weird_fun: "Fun & Quirky",
};

// ── Static params (pre-render all seeded routes at build time) ──
export async function generateStaticParams() {
  const { data } = await supabase.from("routes").select("corridor_id");
  return (data || []).map((r) => ({ "corridor-id": r.corridor_id }));
}

// ── SEO metadata ────────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const corridorId = (await params)["corridor-id"];
  const { data: route } = await supabase
    .from("routes")
    .select("route_from, route_to, route_summary, highway_names")
    .eq("corridor_id", corridorId)
    .single();

  if (!route) return { title: "Route Not Found — Highway Bingo" };

  const hw = route.highway_names?.length ? ` via ${route.highway_names.join(", ")}` : "";
  const from = route.route_from.split(",")[0].trim();
  const to   = route.route_to.split(",")[0].trim();

  return {
    title: `${from} to ${to}${hw} Highway Bingo`,
    description: route.route_summary,
    openGraph: {
      title: `${from} → ${to} Highway Bingo`,
      description: route.route_summary,
      type: "website",
    },
  };
}

// ── Page ────────────────────────────────────────────────────────
export default async function RoutePage({ params }) {
  const corridorId = (await params)["corridor-id"];

  const { data: route } = await supabase
    .from("routes")
    .select("*")
    .eq("corridor_id", corridorId)
    .single();

  if (!route) notFound();

  const [{ data: blurbs }, { data: items }] = await Promise.all([
    supabase
      .from("route_blurbs")
      .select("leg, description")
      .eq("route_id", route.id)
      .order("created_at"),
    supabase
      .from("route_items")
      .select("name, category, route_description, tier")
      .eq("route_id", route.id)
      .neq("tier", "excluded")
      .order("tier", { ascending: false })
      .limit(40),
  ]);

  const allItems     = items || [];
  const teaserItems  = allItems.slice(0, 6);
  const landmarkItems = allItems
    .filter((i) => ["history", "culture", "weird_fun", "nature"].includes(i.category))
    .slice(0, 8);

  const highways = route.highway_names?.filter(Boolean) || [];
  const fromCity = route.route_from.split(",")[0].trim();
  const toCity   = route.route_to.split(",")[0].trim();
  const ctaUrl   = `/?from=${encodeURIComponent(route.route_from)}&to=${encodeURIComponent(route.route_to)}`;

  // Shared box style
  const BOX = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "14px 16px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)", fontFamily: F, color: "#FFF9EE" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)" }}>

        {/* ── Back link ── */}
        <div style={{ paddingTop: 24, paddingBottom: 8 }}>
          <Link href="/" style={{ fontSize: 13, color: "#A89270", textDecoration: "none" }}>
            ← Highway Bingo
          </Link>
        </div>

        {/* ── Hero ── */}
        <div style={{ paddingTop: 28, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {highways.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {highways.map((hw, i) => (
                <span key={i} style={{ background: "rgba(196,152,42,0.15)", border: "1px solid rgba(196,152,42,0.3)", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: "#C4982A", letterSpacing: 1, textTransform: "uppercase" }}>
                  {hw}
                </span>
              ))}
            </div>
          )}
          <h1 style={{ fontFamily: SF, fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, margin: "0 0 6px", lineHeight: 1.15, background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {fromCity} to {toCity}
          </h1>
          <div style={{ fontSize: 15, color: "#A89270", marginBottom: 20 }}>
            {route.route_from} → {route.route_to}
          </div>
          <p style={{ fontSize: 16, color: "#D4C5A9", lineHeight: 1.75, margin: 0 }}>
            {route.route_summary}
          </p>
        </div>

        {/* ── Route Guide ── */}
        {blurbs?.length > 0 && (
          <section style={{ paddingTop: 40, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 6px", color: "#FFF9EE" }}>
              Route Guide
            </h2>
            <p style={{ fontSize: 14, color: "#6B5C48", margin: "0 0 28px" }}>
              What you&#39;ll see along the way
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {blurbs.map((b, i) => (
                <div key={i} style={{ borderLeft: "2px solid rgba(196,152,42,0.35)", paddingLeft: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#C4982A", marginBottom: 8 }}>
                    {b.leg}
                  </div>
                  <p style={{ fontSize: 15, color: "#D4C5A9", lineHeight: 1.8, margin: 0 }}>
                    {b.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── What to Look For ── */}
        {landmarkItems.length > 0 && (
          <section style={{ paddingTop: 40, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 6px", color: "#FFF9EE" }}>
              What to Look For
            </h2>
            <p style={{ fontSize: 14, color: "#6B5C48", margin: "0 0 20px" }}>
              Notable sights along this route
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {landmarkItems.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", ...BOX }}>
                  <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.3 }}>
                    {CATEGORY_EMOJI[item.category] || "📍"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF9EE", marginBottom: 3 }}>{item.name}</div>
                    {item.route_description && (
                      <div style={{ fontSize: 13, color: "#8B7355", lineHeight: 1.55 }}>{item.route_description}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#6B5C48", flexShrink: 0, paddingTop: 2 }}>
                    {CATEGORY_LABEL[item.category] || item.category}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Bingo Teaser ── */}
        {teaserItems.length > 0 && (
          <section style={{ paddingTop: 40, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 6px", color: "#FFF9EE" }}>
              Sample Bingo Items
            </h2>
            <p style={{ fontSize: 14, color: "#6B5C48", margin: "0 0 20px" }}>
              Your cards draw from {allItems.length}+ items specific to this route — every card is different
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxWidth: 400 }}>
              {teaserItems.map((item, i) => (
                <div key={i} style={{
                  aspectRatio: "1", background: "linear-gradient(180deg,#FFF9EE,#F5ECD8)",
                  border: "2px solid #D4C5A9", borderRadius: 8,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", padding: 10, textAlign: "center",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6, lineHeight: 1 }}>
                    {CATEGORY_EMOJI[item.category] || "📍"}
                  </div>
                  <div style={{ fontFamily: BF, fontSize: 10, fontWeight: 700, color: "#3D2E1C", lineHeight: 1.25 }}>
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
            {allItems.length > teaserItems.length && (
              <p style={{ fontSize: 13, color: "#6B5C48", marginTop: 14, fontStyle: "italic" }}>
                + {allItems.length - teaserItems.length} more items on your generated cards
              </p>
            )}
          </section>
        )}

        {/* ── CTA ── */}
        <section style={{ paddingTop: 52, paddingBottom: 52, textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: "clamp(22px,4vw,30px)", fontWeight: 800, margin: "0 0 12px", color: "#FFF9EE" }}>
            Ready to play?
          </h2>
          <p style={{ fontSize: 15, color: "#8B7355", margin: "0 0 28px", lineHeight: 1.65 }}>
            Generate unique bingo cards for every passenger — no two cards are the same.
          </p>
          <Link
            href={ctaUrl}
            style={{
              display: "inline-block", padding: "16px 40px",
              background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
              borderRadius: 12, color: "#FFF", fontSize: 16, fontWeight: 700,
              fontFamily: F, textDecoration: "none", textTransform: "uppercase",
              letterSpacing: 2, boxShadow: "0 4px 20px rgba(196,152,42,0.35)",
            }}
          >
            Generate Your Bingo Cards
          </Link>
          <div style={{ marginTop: 14, fontSize: 13, color: "#6B5C48" }}>
            Free to try · No account needed
          </div>
        </section>

        {/* ── Amazon Associates ── */}
        <section style={{ paddingTop: 40, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#FFF9EE" }}>
            Road Trip Essentials
          </h2>
          <p style={{ fontSize: 13, color: "#6B5C48", margin: "0 0 20px" }}>
            Everything you need for the {fromCity} → {toCity} drive
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {[
              { emoji: "🎮", label: "Travel Games" },
              { emoji: "🍫", label: "Road Trip Snacks" },
              { emoji: "🔋", label: "Portable Charger" },
              { emoji: "🎵", label: "Bluetooth Speaker" },
              { emoji: "🗺️", label: "Road Atlas" },
              { emoji: "🧴", label: "Car Comfort Kit" },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 10, padding: "18px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 26, marginBottom: 8 }}>{item.emoji}</div>
                <div style={{ fontSize: 13, color: "#8B7355", fontWeight: 600, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#4A3728" }}>coming soon</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "#4A3728", fontStyle: "italic" }}>
            As an Amazon Associate, Highway Bingo earns from qualifying purchases.
          </div>
        </section>

        {/* ── Footer ── */}
        <div style={{ paddingTop: 40, paddingBottom: 52, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#6B5C48", marginBottom: 20, lineHeight: 1.65 }}>
            Highway Bingo is free to use. If it made your trip more fun,<br />consider buying me a coffee!
          </p>
          <a
            href="https://buymeacoffee.com/YOUR_USERNAME"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "12px 28px", background: "#FFDD00", borderRadius: 10,
              color: "#000", fontSize: 15, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 2px 12px rgba(255,221,0,0.3)",
            }}
          >
            ☕ Buy me a coffee
          </a>
          <div style={{ marginTop: 32, fontSize: 12, color: "#4A3728" }}>
            <Link href="/" style={{ color: "#6B5C48", textDecoration: "none" }}>← Back to Highway Bingo</Link>
            {" · "}
            <Link href="/routes" style={{ color: "#6B5C48", textDecoration: "none" }}>All Routes</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
