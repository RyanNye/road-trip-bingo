"use client";
import Link from "next/link";

const SF = "'Playfair Display', Georgia, serif";

export default function RouteCard({ route }) {
  return (
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
}
