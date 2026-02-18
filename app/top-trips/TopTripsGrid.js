"use client";
import Link from "next/link";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";

const REGIONS = [
  {
    slug: "north-america",
    label: "North America",
    desc: "From Pacific Coast Highway to the Blue Ridge Parkway — the continent's greatest drives.",
    emoji: "🌎",
  },
  {
    slug: "europe",
    label: "Europe",
    desc: "Coastal corniches, Alpine passes, and ancient royal roads across the continent.",
    emoji: "🏰",
  },
  {
    slug: "latin-america",
    label: "Latin America",
    desc: "Volcanoes, rainforests, and colonial cities along Central and South America's epic routes.",
    emoji: "🌋",
  },
  {
    slug: "africa",
    label: "Africa",
    desc: "Safari corridors, coastal highways, and the legendary Garden Route.",
    emoji: "🦁",
  },
  {
    slug: "australia",
    label: "Australia & Oceania",
    desc: "The Great Ocean Road, the Nullarbor, and stunning Pacific island drives.",
    emoji: "🦘",
  },
  {
    slug: "east-asia",
    label: "East Asia",
    desc: "Mountain temples, bamboo valleys, and dramatic coastal highways.",
    emoji: "⛩️",
  },
  {
    slug: "south-asia",
    label: "South & SE Asia",
    desc: "Spice routes, ancient trade roads, and lush highland highways.",
    emoji: "🛺",
  },
  {
    slug: "west-asia",
    label: "West Asia",
    desc: "Desert highways, ancient caravan routes, and dramatic mountain passes.",
    emoji: "🕌",
  },
];

export default function TopTripsGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
      {REGIONS.map((r) => (
        <Link key={r.slug} href={`/top-trips/${r.slug}`} style={{ textDecoration: "none" }}>
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "20px 22px",
            transition: "border-color 0.15s",
            height: "100%",
          }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(196,152,42,0.4)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>{r.emoji}</div>
            <div style={{ fontFamily: SF, fontSize: 18, fontWeight: 700, color: "#FFF9EE", marginBottom: 6 }}>
              {r.label}
            </div>
            <div style={{ fontSize: 13, color: "#6B5C48", lineHeight: 1.6 }}>
              {r.desc}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: "#C4982A", fontWeight: 600 }}>
              View Top 20 →
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
