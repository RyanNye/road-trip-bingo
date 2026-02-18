"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";

const REGIONS = [
  { slug: "north-america",  label: "North America" },
  { slug: "europe",         label: "Europe" },
  { slug: "latin-america",  label: "Latin America" },
  { slug: "africa",         label: "Africa" },
  { slug: "australia",      label: "Australia & Oceania" },
  { slug: "east-asia",      label: "East Asia" },
  { slug: "south-asia",     label: "South & SE Asia" },
  { slug: "west-asia",      label: "West Asia" },
];

function NavLink({ href, children, pathname }) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link href={href} style={{
      padding: "8px 12px", fontSize: 13, fontWeight: 600, fontFamily: F,
      color: active ? "#C4982A" : "#A89270", textDecoration: "none",
      borderRadius: 6, whiteSpace: "nowrap",
    }}>
      {children}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tripsOpen, setTripsOpen] = useState(false);

  return (
    <nav style={{
      background: "rgba(28,16,8,0.97)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      padding: "0 clamp(16px,4vw,32px)",
      position: "sticky", top: 0, zIndex: 100,
      backdropFilter: "blur(10px)",
      fontFamily: F,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", height: 54 }}>

        {/* Logo */}
        <Link href="/" style={{
          fontFamily: SF, fontSize: 19, fontWeight: 800, color: "#C4982A",
          textDecoration: "none", marginRight: 28, flexShrink: 0,
        }}>
          Highway Bingo
        </Link>

        {/* Desktop links */}
        <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
          {/* Top Trips dropdown */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setTripsOpen(true)}
            onMouseLeave={() => setTripsOpen(false)}
          >
            <NavLink href="/top-trips" pathname={pathname}>Top Trips ▾</NavLink>
            {tripsOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 2px)", left: 0, zIndex: 200,
                background: "#1A0E06", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "6px 0", minWidth: 195,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}>
                {REGIONS.map((r) => (
                  <Link key={r.slug} href={`/top-trips/${r.slug}`} style={{
                    display: "block", padding: "9px 16px", fontSize: 13, fontFamily: F,
                    color: pathname === `/top-trips/${r.slug}` ? "#C4982A" : "#A89270",
                    textDecoration: "none",
                    borderLeft: `2px solid ${pathname === `/top-trips/${r.slug}` ? "#C4982A" : "transparent"}`,
                  }}>
                    {r.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <NavLink href="/routes" pathname={pathname}>Popular Routes</NavLink>
          <NavLink href="/about" pathname={pathname}>About</NavLink>
        </div>

        {/* Generate CTA */}
        <Link href="/" style={{
          padding: "8px 18px", background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
          borderRadius: 8, color: "#FFF", fontSize: 12, fontWeight: 700, fontFamily: F,
          textDecoration: "none", letterSpacing: 1, textTransform: "uppercase",
          boxShadow: "0 2px 10px rgba(196,152,42,0.25)", flexShrink: 0,
          display: "none", // hidden on mobile, shown via media query below
        }} className="nav-cta">
          Make Cards
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="hamburger"
          style={{
            background: "none", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6, padding: "6px 10px", color: "#A89270",
            cursor: "pointer", fontSize: 16, fontFamily: F,
            display: "none", // shown via media query
          }}
          aria-label="Menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 0 16px",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {[
            { href: "/top-trips", label: "Top Trips" },
            ...REGIONS.map((r) => ({ href: `/top-trips/${r.slug}`, label: `  ↳ ${r.label}` })),
            { href: "/routes", label: "Popular Routes" },
            { href: "/about", label: "About" },
            { href: "/", label: "← Generate Cards" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: "10px 16px", fontSize: 14, fontFamily: F,
                color: pathname === href ? "#C4982A" : "#A89270",
                textDecoration: "none", fontWeight: label.startsWith("  ") ? 400 : 600,
              }}
            >
              {label.trim()}
            </Link>
          ))}
        </div>
      )}

      {/* Inline responsive CSS */}
      <style>{`
        @media (min-width: 640px) {
          .desktop-nav { display: flex !important; }
          .nav-cta { display: block !important; }
          .hamburger { display: none !important; }
        }
        @media (max-width: 639px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
