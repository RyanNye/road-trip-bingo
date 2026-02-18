"use client";

import { useState, useRef, useEffect } from "react";

/*
  ROAD TRIP BINGO — Claude-Powered
  Supports any route via Claude API
*/


// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const F = "'Source Sans 3', system-ui, sans-serif";
const SF = "'Playfair Display', Georgia, serif";
const BF = "'Libre Baskerville', Georgia, serif";

const L = { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#A89270", marginBottom: 8 };
const IN = { width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#FFF9EE", fontSize: 16, fontFamily: F, outline: "none", boxSizing: "border-box" };
const B1 = (off) => ({ width: "100%", padding: 16, background: off ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)", border: "none", borderRadius: 12, color: off ? "#6B5C48" : "#FFF", fontSize: 16, fontWeight: 700, fontFamily: F, cursor: off ? "not-allowed" : "pointer", textTransform: "uppercase", letterSpacing: 2, boxShadow: off ? "none" : "0 4px 16px rgba(196,152,42,0.3)" });
const B2 = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 16px", color: "#A89270", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F };
const BOX = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: 20, marginBottom: 16 };

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function toTitleCase(s) {
  return s.split(" ").map((w) => {
    const bare = w.replace(/[^a-zA-Z]/g, "");
    return bare.length <= 2 && bare.length > 0
      ? w.toUpperCase()
      : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

function buildCard(pool, guaranteed, sz, freeItem) {
  const n = sz * sz;
  const center = sz % 2 === 1 ? Math.floor(n / 2) : -1;
  const slotsNeeded = center >= 0 ? n - 1 : n;
  const g = shuffle([...guaranteed]).slice(0, slotsNeeded);
  const rest = shuffle(pool.filter((x) => !guaranteed.includes(x)));
  const picks = [...g];
  for (const it of rest) { if (picks.length >= slotsNeeded) break; picks.push(it); }
  const shuffled = shuffle(picks.slice(0, slotsNeeded));
  if (center >= 0) {
    shuffled.splice(center, 0, freeItem);
  }
  return shuffled;
}

// ═══════════════════════════════════════════════════════════════
// PRINT STYLES
// ═══════════════════════════════════════════════════════════════

const PRINT_CSS = `
@page { margin: 0.3in; }
@media print {
  body, html { background: white !important; margin: 0; padding: 0; }
  .no-print { display: none !important; }
  .print-page {
    page-break-after: always;
    width: 100%;
    min-height: 100vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .print-page:last-child { page-break-after: avoid; }
  .print-card {
    border: 2px solid #333 !important;
    background: white !important;
    box-shadow: none !important;
    max-width: 100% !important;
    width: 100% !important;
  }
  .print-card button {
    border: 1.5px solid #ccc !important;
    background: white !important;
    color: #222 !important;
  }
  .print-card .free-cell {
    background: #f0e6c8 !important;
  }
  .print-header {
    text-align: center;
    margin-bottom: 20px;
    font-family: 'Playfair Display', Georgia, serif;
  }
  .print-header h2 { font-size: 26px; font-weight: 800; margin: 0; color: #222; line-height: 1.2; }
  .screen-only { display: none !important; }
  .print-banner { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .fi { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
@media screen {
  .print-only { display: none !important; }
}
`;

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Cell({ item, size, free, marked, onClick }) {
  const ns = size <= 3 ? 14 : size <= 4 ? 12 : 10;

  return (
    <button onClick={onClick} className={`relative group ${free ? "free-cell" : ""}`} style={{
      aspectRatio: "1",
      background: marked ? "linear-gradient(135deg,#2d5016,#4a7c23)" : free ? "linear-gradient(135deg,#8B6914,#C4982A)" : "#FFFCF5",
      border: `2px solid ${marked ? "#6ab02e" : "#E8DCC8"}`, borderRadius: 8, cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: size >= 5 ? 4 : 8, transition: "all 0.15s", transform: marked ? "scale(0.96)" : "scale(1)",
      boxShadow: marked ? "inset 0 2px 8px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
      overflow: "hidden", position: "relative",
    }}>
      {free ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: BF, fontWeight: 700, fontSize: size <= 3 ? 12 : 10, color: "#FFF", textTransform: "uppercase", lineHeight: 1.1 }}>{item?.name}</div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>FREE</div>
        </div>
      ) : (
        <div style={{ fontFamily: BF, fontWeight: 600, fontSize: ns, color: marked ? "#c8e6a0" : "#3D2E1C", textAlign: "center", lineHeight: 1.15, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: size >= 5 ? 2 : 3, WebkitBoxOrient: "vertical" }}>{item?.name}</div>
      )}
      {/* Tooltip (screen only) */}
      {!free && item?.desc && (
        <div className="absolute z-50 hidden group-hover:block screen-only" style={{
          bottom: "105%", left: "50%", transform: "translateX(-50%)", background: "#3D2E1C", color: "#FFF9EE",
          padding: "8px 12px", borderRadius: 8, fontSize: 12, lineHeight: 1.4, width: 220, fontFamily: F,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)", pointerEvents: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <strong>{item.name}</strong>
            {item.tier === "legendary" && <span style={{ color: "#FF4500", fontSize: 10 }}>★ LEGENDARY</span>}
            {item.tier === "listed" && <span style={{ color: "#2E86DE", fontSize: 10 }}>● LISTED</span>}
            {item.tier === "community_verified" && <span style={{ color: "#FF6B35", fontSize: 10 }}>✦ VERIFIED</span>}
          </div>
          {item.desc}
          <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #3D2E1C" }} />
        </div>
      )}
    </button>
  );
}

function CardGrid({ card, size, freeIdx, marks, onToggle }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${size},1fr)`, gap: size >= 5 ? 4 : 6 }}>
      {card.map((item, i) => (
        <Cell key={i} item={item} size={size} free={i === freeIdx} marked={!!marks[i]}
          onClick={() => onToggle(i)} />
      ))}
    </div>
  );
}

function BingoCard({ card, size, idx, total }) {
  const n = size * size;
  const freeIdx = size % 2 === 1 ? Math.floor(n / 2) : -1;
  const [marks, setMarks] = useState(() => { const m = {}; if (freeIdx >= 0) m[freeIdx] = true; return m; });
  const count = Object.values(marks).filter(Boolean).length;
  const bingo = (() => {
    const g = []; for (let r = 0; r < size; r++) { const row = []; for (let c = 0; c < size; c++) row.push(!!marks[r * size + c]); g.push(row); }
    for (let r = 0; r < size; r++) if (g[r].every(Boolean)) return true;
    for (let c = 0; c < size; c++) if (g.every((row) => row[c])) return true;
    if (g.every((r, i) => r[i])) return true;
    if (g.every((r, i) => r[size - 1 - i])) return true;
    return false;
  })();

  return (
    <div className="print-card" style={{
      background: "linear-gradient(180deg,#FFF9EE,#F5ECD8)", borderRadius: 16, padding: 20,
      border: bingo ? "3px solid #6ab02e" : "2px solid #D4C5A9",
      boxShadow: bingo ? "0 0 30px rgba(106,176,46,0.3)" : "0 4px 20px rgba(0,0,0,0.08)",
      maxWidth: "min(560px, 100%)", width: "100%",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontFamily: SF, fontSize: 13, fontWeight: 700, color: "#8B7355", textTransform: "uppercase", letterSpacing: 2 }}>Card {idx + 1}/{total}</div>
        <div className="screen-only" style={{ fontSize: 12, color: bingo ? "#4a7c23" : "#A89270", fontWeight: 600 }}>{bingo ? "🎉 BINGO!" : `${count}/${n}`}</div>
      </div>
      <CardGrid card={card} size={size} freeIdx={freeIdx} marks={marks} onToggle={(i) => i !== freeIdx && setMarks((p) => ({ ...p, [i]: !p[i] }))} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADD A LANDMARK PANEL
// ═══════════════════════════════════════════════════════════════

function MissPanel({ onAdd }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), desc: desc.trim(), emoji: "📌", category: "custom", tier: "custom" });
    setName(""); setDesc("");
  };

  return (
    <div style={{ maxWidth: 560, margin: "16px auto 0", ...BOX, background: "rgba(224,107,143,0.06)", borderColor: "rgba(224,107,143,0.2)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#E06B8F", marginBottom: 12 }}>Add a Landmark</div>
      <div style={{ fontSize: 13, color: "#8B7355", marginBottom: 12 }}>
        Realize you missed something you know you&#39;ll see? Add it here and it&#39;ll show up on all the cards.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input style={{ ...IN, flex: 1, padding: "8px 12px" }} value={name} onChange={(e) => setName(e.target.value)} placeholder="What will you see?" onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...IN, flex: 1, padding: "8px 12px", fontSize: 14 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" />
        <button onClick={submit} disabled={!name.trim()} style={{ ...B2, padding: "8px 18px", opacity: name.trim() ? 1 : 0.4, color: name.trim() ? "#E06B8F" : "#6B5C48", borderColor: name.trim() ? "rgba(224,107,143,0.3)" : undefined }}>Add</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLAG COMPONENT
// ═══════════════════════════════════════════════════════════════

function FlagSpan({ code }) {
  if (!code) return <div style={{ width: 44, height: 30, flexShrink: 0 }} />;
  return (
    <span
      className={`fi fi-${code}`}
      style={{ display: "inline-block", width: 44, height: 30, flexShrink: 0, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 3, border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [phase, setPhase] = useState("setup");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const gridSize = 5;
  const [numCardsStr, setNumCardsStr] = useState("4");
  const [gensLeft, setGensLeft] = useState(10);
  const [routeData, setRouteData] = useState(null);

  const [wpInput, setWpInput] = useState("");
  const [waypoints, setWaypoints] = useState([]);

  const [customItems, setCustomItems] = useState([]);
  const [ciName, setCiName] = useState("");
  const [ciDesc, setCiDesc] = useState("");

  const [allItems, setAllItems] = useState([]);
  const [cards, setCards] = useState([]);
  const [activeCard, setActiveCard] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadMsg, setLoadMsg] = useState("");
  const progRef = useRef(null);

  const [blurb, setBlurb] = useState(null);
  const [returnBanner, setReturnBanner] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [genError, setGenError] = useState(null);

  const freeItem = { name: "First Pit Stop", emoji: "🚻", desc: "", category: "free", tier: "free" };

  useEffect(() => {
    const s = localStorage.getItem("rtb_last_session");
    if (s) setReturnBanner(JSON.parse(s));
  }, []);

  const planRoute = async () => {
    setRouteError(null);
    setPhase("loading");
    try {
      const res = await fetch("/api/analyze-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, waypoints }),
      });
      if (!res.ok) throw new Error("Route analysis failed");
      const data = await res.json();
      setRouteData(data);
      setPhase("route");
    } catch (err) {
      setRouteError(err.message);
      setPhase("setup");
    }
  };

  const addCustom = () => {
    if (!ciName.trim()) return;
    setCustomItems((p) => [...p, { name: ciName.trim(), desc: ciDesc.trim(), emoji: "📌", category: "custom", tier: "custom" }]);
    setCiName(""); setCiDesc("");
  };

  const generate = async () => {
    if (gensLeft <= 0) return;
    const numCards = Math.min(20, Math.max(1, parseInt(numCardsStr) || 4));
    setGenError(null);
    setPhase("generating"); setProgress(0);
    const msgs = ["Checking community database...", "Scanning route corridor...", "Identifying landmarks...", "Balancing categories...", "Creating unique cards...", "Finalizing..."];
    let mi = 0; setLoadMsg(msgs[0]);
    progRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12 + 5, 95));
      mi = Math.min(mi + 1, msgs.length - 1); setLoadMsg(msgs[mi]);
    }, 400);

    try {
      const res = await fetch("/api/generate-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_name: routeData?.route_name,
          route_summary: routeData?.route_summary,
          major_waypoints: routeData?.major_waypoints,
          route_coordinates: routeData?.route_coordinates,
          _routeId: routeData?._routeId,
          from,
          to,
        }),
      });
      if (!res.ok) throw new Error("Item generation failed");
      const data = await res.json();

      clearInterval(progRef.current); setProgress(100); setLoadMsg("Done!");
      const pool = [...customItems, ...(data.items || [])];
      setAllItems(pool);

      localStorage.setItem("rtb_last_session", JSON.stringify({
        from, to, routeId: data._routeId, items: pool,
      }));

      fetch("/api/generate-blurb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_name: routeData?.route_name,
          route_summary: routeData?.route_summary,
          major_waypoints: routeData?.major_waypoints,
          from, to,
        }),
      }).then((r) => r.json()).then((d) => setBlurb(d)).catch(() => {});

      const guaranteed = pool.filter((i) => i.tier === "custom" || i.tier === "legendary" || i.tier === "community_verified");
      const built = [];
      for (let i = 0; i < numCards; i++) built.push(buildCard(pool, guaranteed, gridSize, freeItem));
      setCards(built); setActiveCard(0); setGensLeft((p) => p - 1);
      setTimeout(() => setPhase("cards"), 300);
    } catch (err) {
      clearInterval(progRef.current);
      setGenError(err.message);
      setPhase("custom");
    }
  };

  const handleMissAdd = (newItem) => {
    setAllItems((prev) => [...prev, newItem]);
    setCards((prev) => {
      const tierRank = { generic: 0, ai_generated: 1, listed: 2, community_verified: 3, legendary: 4, custom: 5, free: 6 };
      const center = gridSize % 2 === 1 ? Math.floor((gridSize * gridSize) / 2) : -1;
      // Find the least important item name appearing in any card
      let target = null;
      for (const card of prev) {
        for (let i = 0; i < card.length; i++) {
          const item = card[i];
          if (i === center || item.tier === "free" || item.tier === "custom") continue;
          if (!target || (tierRank[item.tier] ?? 1) < (tierRank[target.tier] ?? 1)) target = item;
        }
      }
      if (!target) return prev;
      // Replace every occurrence of that item name across all cards
      return prev.map((card) =>
        card.map((item, i) => (i !== center && item.name === target.name ? newItem : item))
      );
    });
  };

  const handlePrint = () => window.print();

  const reset = () => {
    setPhase("setup"); setCards([]); setAllItems([]); setCustomItems([]);
    setActiveCard(0); setWaypoints([]); setRouteData(null); setBlurb(null);
  };

  const [fb, setFb] = useState({});
  const [fbDone, setFbDone] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)", fontFamily: F, color: "#FFF9EE" }}>
      <style>{PRINT_CSS}</style>
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none" }} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet" />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <header className="no-print" style={{ padding: "32px 24px 20px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 style={{ fontFamily: SF, fontSize: "clamp(30px,6vw,48px)", fontWeight: 900, margin: 0, lineHeight: 1.2, paddingBottom: "0.1em", background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>Highway Bingo</h1>
          <p style={{ fontSize: 14, color: "#A89270", marginTop: 8, fontStyle: "italic" }}>Turn your roadtrip into an adventure</p>
        </header>

        {/* ─── SETUP ─── */}
        {phase === "setup" && (
          <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", padding: "32px clamp(12px,4vw,24px)", width: "100%", boxSizing: "border-box" }}>
            {returnBanner && (
              <div style={{ marginBottom: 20, padding: 16, background: "rgba(196,152,42,0.08)", border: "1px solid rgba(196,152,42,0.2)", borderRadius: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#C4982A", marginBottom: 8 }}>Welcome back! How was your {returnBanner.from} → {returnBanner.to} trip?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setAllItems(returnBanner.items); setFrom(returnBanner.from); setTo(returnBanner.to); setFb({}); setFbDone(false); setPhase("feedback"); }} style={{ ...B2, color: "#C4982A", borderColor: "rgba(196,152,42,0.3)" }}>Leave Feedback</button>
                  <button onClick={() => { localStorage.removeItem("rtb_last_session"); setReturnBanner(null); }} style={B2}>Dismiss</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{ background: "rgba(196,152,42,0.1)", border: "1px solid rgba(196,152,42,0.3)", borderRadius: 100, padding: "8px 20px", fontSize: 13, fontWeight: 600, color: "#C4982A" }}>
                {gensLeft} free generation{gensLeft !== 1 ? "s" : ""} remaining
              </div>
            </div>
            <div style={{ marginBottom: 24 }}><label style={L}>Starting Point</label><input style={IN} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Chicago, IL" /></div>
            <div style={{ textAlign: "center", margin: "4px 0", color: "#6B5C48", fontSize: 20 }}>↓</div>
            <div style={{ marginBottom: 28 }}><label style={L}>Destination</label><input style={IN} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Santa Monica, CA" /></div>
            <div style={{ marginBottom: 32 }}>
              <label style={L}>How many cards?</label>
              <input type="text" inputMode="numeric" style={IN}
                value={numCardsStr} onChange={(e) => setNumCardsStr(e.target.value)} placeholder="1-20" />
            </div>
            <button onClick={planRoute} disabled={!from.trim() || !to.trim()} style={B1(!from.trim() || !to.trim())}>Plan My Route</button>
            {routeError && (
              <div style={{ marginTop: 16, padding: 16, background: "rgba(224,107,143,0.08)", border: "1px solid rgba(224,107,143,0.2)", borderRadius: 10, color: "#E06B8F", fontSize: 14 }}>
                Could not analyze this route. Check your city names and try again.
                <button onClick={planRoute} style={{ ...B2, marginTop: 8, width: "100%" }}>Retry</button>
              </div>
            )}
            <div style={{ marginTop: 24, padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#C4982A", marginBottom: 4 }}>💡 Pro tip</div>
              <div style={{ fontSize: 13, color: "#8B7355", lineHeight: 1.5 }}>Whoever gets BINGO first earns a head start on tonight&#39;s board game, first pick of hotel beds, or choice of restaurant!</div>
            </div>
          </div>
        )}

        {/* ─── LOADING ─── */}
        {phase === "loading" && (
          <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, margin: "0 auto 20px", borderRadius: "50%", border: "3px solid rgba(196,152,42,0.2)", borderTopColor: "#C4982A", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontFamily: SF, fontSize: 20, fontWeight: 700 }}>Analyzing your route...</div>
            <div style={{ fontSize: 13, color: "#6B5C48", marginTop: 8 }}>{from} → {to}</div>
          </div>
        )}

        {/* ─── ROUTE CONFIRM ─── */}
        {phase === "route" && (
          <div className="no-print" style={{ maxWidth: 520, margin: "0 auto", padding: "32px clamp(12px,4vw,24px)", width: "100%", boxSizing: "border-box" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#C4982A", marginBottom: 8 }}>Confirm Your Route</div>
              <div style={{ fontFamily: SF, fontSize: 24, fontWeight: 700 }}>{from} → {to}</div>
              <div style={{ fontSize: 13, color: "#6B5C48", marginTop: 4 }}>Add waypoints to customize your path</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={L}>Add Waypoints (optional)</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...IN, flex: 1, padding: "10px 14px" }} value={wpInput} onChange={(e) => setWpInput(e.target.value)} placeholder="... Add your favorite detour"
                  onKeyDown={(e) => { if (e.key === "Enter" && wpInput.trim()) { setWaypoints((p) => [...p, wpInput.trim()]); setWpInput(""); } }} />
                <button onClick={() => { if (wpInput.trim()) { setWaypoints((p) => [...p, wpInput.trim()]); setWpInput(""); } }} disabled={!wpInput.trim()} style={{ ...B2, padding: "10px 18px", opacity: wpInput.trim() ? 1 : 0.4, color: wpInput.trim() ? "#C4982A" : "#6B5C48" }}>Add</button>
              </div>
              {waypoints.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {waypoints.map((wp, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(224,107,143,0.08)", border: "1px solid rgba(224,107,143,0.2)", borderRadius: 100, padding: "4px 12px", fontSize: 13, color: "#E06B8F" }}>
                      {wp} <button onClick={() => setWaypoints((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#E06B8F", cursor: "pointer", fontSize: 14 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={BOX}>
              <div style={{ fontSize: 12, color: "#A89270", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Route</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{routeData?.route_name}</div>
              <div style={{ fontSize: 14, color: "#8B7355", lineHeight: 1.5 }}>{routeData?.route_summary}</div>
            </div>
            <div style={BOX}>
              <div style={{ fontSize: 12, color: "#A89270", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Passing Through</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {routeData?.major_waypoints.map((wp, i) => (
                  <div key={i} style={{ background: "rgba(196,152,42,0.1)", border: "1px solid rgba(196,152,42,0.25)", borderRadius: 100, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#C4982A" }}>{wp.name}, {wp.country}</div>
                ))}
              </div>
            </div>
            <div style={{ ...BOX, background: "rgba(196,152,42,0.06)", borderColor: "rgba(196,152,42,0.15)" }}>
              <div style={{ fontSize: 12, color: "#C4982A", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>⭐ Notable Highway Landmarks</div>
              {routeData?.notable_highway_landmarks.map((lm, i) => (
                <div key={i} style={{ fontSize: 13, color: "#D4C5A9", lineHeight: 1.5, padding: "6px 0", borderBottom: i < routeData?.notable_highway_landmarks.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{lm}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={reset} style={{ ...B2, flex: 1, padding: 14 }}>← Back</button>
              <button onClick={() => setPhase("custom")} style={{ ...B1(false), flex: 2 }}>Looks Good — Next →</button>
            </div>
          </div>
        )}

        {/* ─── CUSTOM ITEMS ─── */}
        {phase === "custom" && (
          <div className="no-print" style={{ maxWidth: 520, margin: "0 auto", padding: "32px clamp(12px,4vw,24px)", width: "100%", boxSizing: "border-box" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#C4982A", marginBottom: 8 }}>Optional</div>
              <div style={{ fontFamily: SF, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Add Your Own Items</div>
              <div style={{ fontSize: 14, color: "#8B7355" }}>These appear on every card. AI fills the rest.</div>
            </div>
            {customItems.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {customItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(224,107,143,0.08)", border: "1px solid rgba(224,107,143,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>{item.desc && <div style={{ fontSize: 12, color: "#8B7355" }}>{item.desc}</div>}</div>
                    <button onClick={() => setCustomItems((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#E06B8F", cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ ...BOX, padding: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...IN, flex: 1, padding: "8px 12px" }} value={ciName} onChange={(e) => setCiName(e.target.value)} placeholder="Item name" onKeyDown={(e) => e.key === "Enter" && addCustom()} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...IN, flex: 1, padding: "8px 12px", fontSize: 14 }} value={ciDesc} onChange={(e) => setCiDesc(e.target.value)} placeholder="Description (optional)" />
                <button onClick={addCustom} disabled={!ciName.trim()} style={{ ...B2, padding: "8px 18px", opacity: ciName.trim() ? 1 : 0.4, color: ciName.trim() ? "#C4982A" : "#6B5C48" }}>Add</button>
              </div>
            </div>
            {genError && (
              <div style={{ marginBottom: 16, padding: 16, background: "rgba(224,107,143,0.08)", border: "1px solid rgba(224,107,143,0.2)", borderRadius: 10, color: "#E06B8F", fontSize: 14 }}>
                Could not generate cards. Please try again.
                <button onClick={generate} style={{ ...B2, marginTop: 8, width: "100%" }}>Retry</button>
              </div>
            )}
            <button onClick={generate} style={B1(false)}>Generate {Math.min(20, Math.max(1, parseInt(numCardsStr) || 4))} Card{Math.min(20, Math.max(1, parseInt(numCardsStr) || 4)) !== 1 ? "s" : ""} 🎲</button>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={() => setPhase("route")} style={{ background: "none", border: "none", color: "#6B5C48", cursor: "pointer", fontSize: 13 }}>← Back to route</button>
            </div>
            {customItems.length === 0 && (
              <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#C4982A", marginBottom: 4 }}>💡 Ideas</div>
                <div style={{ fontSize: 13, color: "#8B7355", lineHeight: 1.6 }}>Planned detours, a restaurant you&#39;ll stop at, a landmark near your hotel, your kid&#39;s favorite car brand...</div>
              </div>
            )}
          </div>
        )}

        {/* ─── GENERATING ─── */}
        {phase === "generating" && (
          <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, margin: "0 auto 20px", borderRadius: "50%", border: "3px solid rgba(196,152,42,0.2)", borderTopColor: "#C4982A", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ fontFamily: SF, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{loadMsg}</div>
            <div style={{ fontSize: 13, color: "#6B5C48", marginBottom: 20 }}>{from} → {to} via {routeData?.route_name}</div>
            <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#8B6914,#C4982A)", transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* ─── CARDS ─── */}
        {phase === "cards" && (
          <div style={{ padding: 24 }}>
            {/* Large route banner */}
            <div className="no-print" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 20px", width: "100%" }}>
              <div style={{ fontFamily: SF, fontSize: "clamp(24px,5vw,36px)", fontWeight: 900, lineHeight: 1.2, paddingBottom: "0.1em", background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>
                {from.split(",")[0].trim()} to {to.split(",")[0].trim()}
              </div>
              <div style={{ fontSize: 15, color: "#C4982A", fontWeight: 600, marginTop: 4 }}>Route Summary</div>
            </div>

            {/* Active bingo card */}
            <div className="screen-only" style={{ display: "flex", justifyContent: "center", width: "100%", boxSizing: "border-box", marginBottom: 16 }}>
              <BingoCard card={cards[activeCard]} size={gridSize} idx={activeCard} total={cards.length} key={`card-${activeCard}`} />
            </div>

            {/* Card tabs — centered */}
            <div className="no-print" style={{ maxWidth: 560, margin: "0 auto 4px", width: "100%", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6 }}>
              {cards.map((_, i) => (
                <button key={i} onClick={() => setActiveCard(i)} style={{ padding: "6px 16px", borderRadius: 100, border: `1px solid ${activeCard === i ? "#C4982A" : "rgba(255,255,255,0.12)"}`, background: activeCard === i ? "linear-gradient(135deg,#8B6914,#C4982A)" : "rgba(255,255,255,0.04)", color: activeCard === i ? "#FFF" : "#6B5C48", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Card {i + 1}</button>
              ))}
            </div>
            {/* Print All — right aligned below tabs */}
            <div className="no-print" style={{ maxWidth: 560, margin: "0 auto 16px", width: "100%", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handlePrint} style={{ ...B2, background: "rgba(196,152,42,0.08)", borderColor: "rgba(196,152,42,0.2)", color: "#C4982A", whiteSpace: "nowrap" }}>🖨️ Print All</button>
            </div>

            {/* Add a Landmark */}
            <div className="no-print"><MissPanel onAdd={handleMissAdd} /></div>

            {/* Blurb */}
            {blurb?.blurbs?.length > 0 && (
              <div className="no-print" style={{ maxWidth: 560, margin: "16px auto 0" }}>
                {blurb.blurbs.map((b, i) => (
                  <div key={i} style={{ ...BOX, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#C4982A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{b.leg}</div>
                    <div style={{ fontSize: 13, color: "#D4C5A9", lineHeight: 1.6 }}>{b.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom buttons */}
            <div className="no-print" style={{ maxWidth: 560, margin: "24px auto 0", width: "100%", display: "flex", gap: 12 }}>
              <button onClick={reset} style={B2}>← New Route</button>
              <button onClick={() => { setFb({}); setFbDone(false); setPhase("feedback"); }} style={{ ...B2, color: "#C4982A", borderColor: "rgba(196,152,42,0.3)" }}>Leave a Review</button>
            </div>

            {/* Print output */}
            <div className="print-only">
              {blurb?.blurbs?.length > 0 && (
                <div className="print-page" style={{ padding: "0.5in", alignItems: "flex-start", justifyContent: "flex-start" }}>
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: "#333", marginBottom: 6 }}>Route Guide</div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>{from} → {to}</div>
                  {blurb.blurbs.map((b, i) => (
                    <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < blurb.blurbs.length - 1 ? "1px solid #ddd" : "none" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#8B6914", marginBottom: 6 }}>{b.leg}</div>
                      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.7 }}>{b.description}</div>
                    </div>
                  ))}
                </div>
              )}
              {cards.map((card, ci) => (
                <div key={ci} className="print-page">
                  <div style={{ border: "3px solid #8B6914", borderRadius: 10, overflow: "hidden", width: "100%", background: "white" }}>
                    {/* Colored banner */}
                    <div className="print-banner" style={{ position: "relative", padding: "14px 20px", borderBottom: "2px solid #8B6914", background: "linear-gradient(135deg, #7A5514, #C4982A)", display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ position: "absolute", inset: 5, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 5, pointerEvents: "none" }} />
                      <FlagSpan code={routeData?.origin_flag_code} />
                      <div style={{ flex: 1, textAlign: "center", fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 800, color: "white", lineHeight: 1.25 }}>
                        {toTitleCase(from)} to {toTitleCase(to)} Highway Bingo!
                      </div>
                      <FlagSpan code={routeData?.destination_flag_code} />
                    </div>
                    {/* Bingo grid */}
                    <div style={{ padding: 12, background: "white" }}>
                      <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridSize},1fr)`, gap: 4 }}>
                        {card.map((item, i) => {
                          const isFree = gridSize % 2 === 1 && i === Math.floor((gridSize * gridSize) / 2);
                          return (
                            <div key={i} style={{
                              aspectRatio: "1", border: `1.5px solid ${isFree ? "#888" : "#ccc"}`, borderRadius: 5,
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                              padding: 5, background: isFree ? "#f5ead0" : "white", textAlign: "center",
                            }}>
                              <div style={{ fontSize: 9, fontWeight: isFree ? 700 : 600, color: "#111", lineHeight: 1.2 }}>
                                {isFree ? `${item.name} ★` : item.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── FEEDBACK ─── */}
        {phase === "feedback" && (
          <div className="no-print" style={{ maxWidth: 520, margin: "0 auto", padding: "32px clamp(12px,4vw,24px)", width: "100%", boxSizing: "border-box" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#C4982A", marginBottom: 8 }}>Post-Trip Review</div>
              <div style={{ fontFamily: SF, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>How&#39;d It Go?</div>
              <div style={{ fontSize: 14, color: "#8B7355" }}>Help future travelers on this route</div>
            </div>
            {fbDone ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <div style={{ fontFamily: SF, fontSize: 24, fontWeight: 700 }}>Thanks!</div>
                <div style={{ fontSize: 14, color: "#8B7355", marginTop: 8, marginBottom: 24 }}>Your feedback helps future travelers.</div>
                <button onClick={reset} style={B1(false)}>Start New Route</button>
              </div>
            ) : (
              <>
                {allItems.filter((i) => i.tier !== "custom" && i.tier !== "free").slice(0, 16).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{item.emoji}</span>
                    <div style={{ flex: 1, fontSize: 14 }}>{item.name}</div>
                    {[{ t: "spotted", icon: "👁️" }, { t: "missed", icon: "❌" }, { t: "confusing", icon: "❓" }].map(({ t, icon }) => (
                      <button key={t} onClick={() => setFb((p) => ({ ...p, [item.name]: p[item.name] === t ? null : t }))}
                        style={{ width: 34, height: 34, background: fb[item.name] === t ? "rgba(196,152,42,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${fb[item.name] === t ? "rgba(196,152,42,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {icon}
                      </button>
                    ))}
                  </div>
                ))}
                <button onClick={() => { localStorage.removeItem("rtb_last_session"); setReturnBanner(null); setFbDone(true); }} style={{ ...B1(false), marginTop: 24 }}>Submit Feedback</button>
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <button onClick={() => setPhase("cards")} style={{ background: "none", border: "none", color: "#6B5C48", cursor: "pointer", fontSize: 13 }}>← Back to cards</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
