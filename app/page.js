"use client";

import { useState, useRef } from "react";

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
@media print {
  body, html { background: white !important; margin: 0; padding: 0; }
  .no-print { display: none !important; }
  .print-page {
    page-break-after: always;
    width: 100%;
    padding: 0.5in;
    box-sizing: border-box;
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
    margin-bottom: 16px;
    font-family: 'Playfair Display', Georgia, serif;
  }
  .print-header h2 { font-size: 28px; margin: 0; color: #333; }
  .print-header p { font-size: 12px; color: #888; margin: 4px 0 0; }
  .screen-only { display: none !important; }
}
@media screen {
  .print-only { display: none !important; }
}
`;

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Cell({ item, size, free, marked, onClick }) {
  const es = size <= 3 ? 28 : size <= 4 ? 22 : 18;
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
          <div style={{ fontSize: size <= 3 ? 20 : 16, marginBottom: 2 }}>{item?.emoji || "📍"}</div>
          <div style={{ fontFamily: BF, fontWeight: 700, fontSize: size <= 3 ? 12 : 10, color: "#FFF", textTransform: "uppercase", lineHeight: 1.1 }}>{item?.name}</div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.7)", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>START</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: es, lineHeight: 1, marginBottom: 2 }}>{marked ? "✓" : item?.emoji}</div>
          <div style={{ fontFamily: BF, fontWeight: 600, fontSize: ns, color: marked ? "#c8e6a0" : "#3D2E1C", textAlign: "center", lineHeight: 1.15, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: size >= 5 ? 2 : 3, WebkitBoxOrient: "vertical" }}>{item?.name}</div>
        </>
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
      maxWidth: size <= 3 ? 400 : size <= 4 ? 500 : 560, width: "100%",
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
// MISS ANYTHING PANEL
// ═══════════════════════════════════════════════════════════════

function MissPanel({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), desc: desc.trim(), emoji: emoji.trim() || "📌", category: "custom", tier: "custom" });
    setName(""); setDesc(""); setEmoji("");
  };

  return (
    <div style={{ maxWidth: 560, margin: "16px auto 0", ...BOX, background: "rgba(224,107,143,0.06)", borderColor: "rgba(224,107,143,0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#E06B8F" }}>🔍 Miss anything?</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#6B5C48", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>
      <div style={{ fontSize: 13, color: "#8B7355", marginBottom: 12 }}>
        Add something you&#39;re seeing on the road. It&#39;ll swap out a filler item on all cards.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input style={{ ...IN, width: 50, flex: "none", textAlign: "center", fontSize: 18, padding: "8px 4px" }} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🏰" maxLength={2} />
        <input style={{ ...IN, flex: 1, padding: "8px 12px" }} value={name} onChange={(e) => setName(e.target.value)} placeholder="What did you see?" onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...IN, flex: 1, padding: "8px 12px", fontSize: 14 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" />
        <button onClick={submit} disabled={!name.trim()} style={{ ...B2, padding: "8px 18px", opacity: name.trim() ? 1 : 0.4, color: name.trim() ? "#E06B8F" : "#6B5C48", borderColor: name.trim() ? "rgba(224,107,143,0.3)" : undefined }}>Add</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function App() {
  const [phase, setPhase] = useState("setup");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [gridSize, setGridSize] = useState(4);
  const [numCards, setNumCards] = useState(4);
  const [gensLeft, setGensLeft] = useState(3);
  const [routeData, setRouteData] = useState(null);

  const [wpInput, setWpInput] = useState("");
  const [waypoints, setWaypoints] = useState([]);

  const [customItems, setCustomItems] = useState([]);
  const [ciName, setCiName] = useState("");
  const [ciDesc, setCiDesc] = useState("");
  const [ciEmoji, setCiEmoji] = useState("");

  const [allItems, setAllItems] = useState([]);
  const [cards, setCards] = useState([]);
  const [activeCard, setActiveCard] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loadMsg, setLoadMsg] = useState("");
  const [showMiss, setShowMiss] = useState(false);
  const progRef = useRef(null);

  const freeItem = { name: from.split(",")[0].trim(), emoji: "📍", desc: "", category: "free", tier: "free" };

  const planRoute = async () => {
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
      alert("Failed to analyze route: " + err.message);
      setPhase("setup");
    }
  };

  const addCustom = () => {
    if (!ciName.trim()) return;
    setCustomItems((p) => [...p, { name: ciName.trim(), desc: ciDesc.trim(), emoji: ciEmoji.trim() || "📌", category: "custom", tier: "custom" }]);
    setCiName(""); setCiDesc(""); setCiEmoji("");
  };

  const generate = async () => {
    if (gensLeft <= 0) return;
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
      const guaranteed = pool.filter((i) => i.tier === "custom" || i.tier === "legendary" || i.tier === "community_verified");
      const built = [];
      for (let i = 0; i < numCards; i++) built.push(buildCard(pool, guaranteed, gridSize, freeItem));
      setCards(built); setActiveCard(0); setGensLeft((p) => p - 1);
      setTimeout(() => setPhase("cards"), 300);
    } catch (err) {
      clearInterval(progRef.current);
      alert("Failed to generate items: " + err.message);
      setPhase("custom");
    }
  };

  const handleMissAdd = (newItem) => {
    setAllItems((prev) => [...prev, newItem]);
    setCards((prev) => prev.map((card) => {
      const replaceIdx = card.findIndex((it, i) => {
        const center = gridSize % 2 === 1 ? Math.floor((gridSize * gridSize) / 2) : -1;
        return i !== center && it.tier === "generic";
      });
      if (replaceIdx === -1) return card;
      const newCard = [...card];
      newCard[replaceIdx] = newItem;
      return newCard;
    }));
    setShowMiss(false);
  };

  const handlePrint = () => window.print();

  const reset = () => {
    setPhase("setup"); setCards([]); setAllItems([]); setCustomItems([]);
    setActiveCard(0); setWaypoints([]); setShowMiss(false); setRouteData(null);
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
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 4, color: "#C4982A", marginBottom: 8 }}>Road Trip</div>
          <h1 style={{ fontFamily: SF, fontSize: "clamp(36px,6vw,52px)", fontWeight: 900, margin: 0, lineHeight: 1, background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>BINGO</h1>
          <p style={{ fontSize: 14, color: "#A89270", marginTop: 8, fontStyle: "italic" }}>Turn any highway into an adventure</p>
        </header>

        {/* ─── SETUP ─── */}
        {phase === "setup" && (
          <div className="no-print" style={{ maxWidth: 480, margin: "0 auto", padding: "32px 24px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{ background: "rgba(196,152,42,0.1)", border: "1px solid rgba(196,152,42,0.3)", borderRadius: 100, padding: "8px 20px", fontSize: 13, fontWeight: 600, color: "#C4982A" }}>
                {gensLeft} free generation{gensLeft !== 1 ? "s" : ""} remaining
              </div>
            </div>
            <div style={{ marginBottom: 24 }}><label style={L}>Starting Point</label><input style={IN} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Paris, France" /></div>
            <div style={{ textAlign: "center", margin: "4px 0", color: "#6B5C48", fontSize: 20 }}>↓</div>
            <div style={{ marginBottom: 28 }}><label style={L}>Destination</label><input style={IN} value={to} onChange={(e) => setTo(e.target.value)} placeholder="e.g. Berlin, Germany" /></div>
            <div style={{ marginBottom: 24 }}>
              <label style={L}>Grid Size</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[3, 4, 5].map((sz) => (
                  <button key={sz} onClick={() => setGridSize(sz)} style={{ flex: 1, padding: 12, background: gridSize === sz ? "linear-gradient(135deg,#8B6914,#C4982A)" : "rgba(255,255,255,0.06)", border: `1px solid ${gridSize === sz ? "#C4982A" : "rgba(255,255,255,0.12)"}`, borderRadius: 10, color: gridSize === sz ? "#FFF" : "#A89270", cursor: "pointer", fontWeight: 700 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{sz}×{sz}</div>
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>{sz === 3 ? "Quick" : sz === 4 ? "Standard" : "Classic"}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 32 }}>
              <label style={L}>Number of Cards</label>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button onClick={() => setNumCards(Math.max(1, numCards - 1))} style={{ width: 44, height: 44, ...B2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>−</button>
                <div style={{ flex: 1, textAlign: "center", fontFamily: SF, fontSize: 32, fontWeight: 700 }}>{numCards}</div>
                <button onClick={() => setNumCards(Math.min(8, numCards + 1))} style={{ width: 44, height: 44, ...B2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>+</button>
              </div>
            </div>
            <button onClick={planRoute} disabled={!from.trim() || !to.trim()} style={B1(!from.trim() || !to.trim())}>Plan My Route</button>
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
          <div className="no-print" style={{ maxWidth: 520, margin: "0 auto", padding: "32px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#C4982A", marginBottom: 8 }}>Confirm Your Route</div>
              <div style={{ fontFamily: SF, fontSize: 24, fontWeight: 700 }}>{from} → {to}</div>
              <div style={{ fontSize: 13, color: "#6B5C48", marginTop: 4 }}>Add waypoints to customize your path</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={L}>Add Waypoints (optional)</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...IN, flex: 1, padding: "10px 14px" }} value={wpInput} onChange={(e) => setWpInput(e.target.value)} placeholder="e.g. Cologne, Brussels..."
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
          <div className="no-print" style={{ maxWidth: 520, margin: "0 auto", padding: "32px 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: "#C4982A", marginBottom: 8 }}>Optional</div>
              <div style={{ fontFamily: SF, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Add Your Own Items</div>
              <div style={{ fontSize: 14, color: "#8B7355" }}>These appear on every card. AI fills the rest.</div>
            </div>
            {customItems.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                {customItems.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(224,107,143,0.08)", border: "1px solid rgba(224,107,143,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{item.emoji}</span>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div>{item.desc && <div style={{ fontSize: 12, color: "#8B7355" }}>{item.desc}</div>}</div>
                    <button onClick={() => setCustomItems((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#E06B8F", cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ ...BOX, padding: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...IN, width: 50, flex: "none", textAlign: "center", fontSize: 18, padding: "8px 4px" }} value={ciEmoji} onChange={(e) => setCiEmoji(e.target.value)} placeholder="🏰" maxLength={2} />
                <input style={{ ...IN, flex: 1, padding: "8px 12px" }} value={ciName} onChange={(e) => setCiName(e.target.value)} placeholder="Item name" onKeyDown={(e) => e.key === "Enter" && addCustom()} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...IN, flex: 1, padding: "8px 12px", fontSize: 14 }} value={ciDesc} onChange={(e) => setCiDesc(e.target.value)} placeholder="Description (optional)" />
                <button onClick={addCustom} disabled={!ciName.trim()} style={{ ...B2, padding: "8px 18px", opacity: ciName.trim() ? 1 : 0.4, color: ciName.trim() ? "#C4982A" : "#6B5C48" }}>Add</button>
              </div>
            </div>
            <button onClick={generate} style={B1(false)}>Generate {numCards} Card{numCards !== 1 ? "s" : ""} 🎲</button>
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
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 560, margin: "0 auto 16px" }}>
              <button onClick={reset} style={B2}>← New Route</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handlePrint} style={{ ...B2, background: "rgba(196,152,42,0.08)", borderColor: "rgba(196,152,42,0.2)", color: "#C4982A" }}>🖨️ Print All</button>
              </div>
            </div>
            <div className="no-print" style={{ textAlign: "center", fontSize: 12, color: "#6B5C48", marginBottom: 12 }}>{from} → {to} via {routeData?.route_name}</div>

            {cards.length > 1 && (
              <div className="no-print" style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {cards.map((_, i) => (
                  <button key={i} onClick={() => setActiveCard(i)} style={{ padding: "6px 16px", borderRadius: 100, border: `1px solid ${activeCard === i ? "#C4982A" : "rgba(255,255,255,0.12)"}`, background: activeCard === i ? "linear-gradient(135deg,#8B6914,#C4982A)" : "rgba(255,255,255,0.04)", color: activeCard === i ? "#FFF" : "#6B5C48", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Card {i + 1}</button>
                ))}
              </div>
            )}

            <div className="screen-only" style={{ display: "flex", justifyContent: "center" }}>
              <BingoCard card={cards[activeCard]} size={gridSize} idx={activeCard} total={cards.length} key={`card-${activeCard}`} />
            </div>

            <div className="no-print" style={{ maxWidth: 560, margin: "12px auto 0", textAlign: "center", fontSize: 12, color: "#6B5C48" }}>
              {allItems.length} items in pool • Hover cells for details
            </div>

            <div className="no-print" style={{ maxWidth: 460, margin: "16px auto 0", display: "flex", gap: 8 }}>
              <div style={{ flex: 1, padding: "12px 16px", background: "rgba(196,152,42,0.08)", border: "1px solid rgba(196,152,42,0.15)", borderRadius: 10, textAlign: "center", fontSize: 13, color: "#C4982A", fontStyle: "italic" }}>🏆 Announce the prize first!</div>
              <button onClick={() => setShowMiss(!showMiss)} style={{ ...B2, padding: "12px 14px", fontSize: 12, background: "rgba(224,107,143,0.08)", borderColor: "rgba(224,107,143,0.2)", color: "#E06B8F" }}>🔍 Miss?</button>
              <button onClick={() => { setFb({}); setFbDone(false); setPhase("feedback"); }} style={{ ...B2, padding: "12px 14px", fontSize: 12, background: "rgba(255,107,53,0.08)", borderColor: "rgba(255,107,53,0.2)", color: "#FF6B35" }}>📝 Review</button>
            </div>

            {showMiss && <div className="no-print"><MissPanel onAdd={handleMissAdd} onClose={() => setShowMiss(false)} /></div>}

            <div className="print-only">
              {cards.map((card, ci) => (
                <div key={ci} className="print-page">
                  <div className="print-header">
                    <h2>Road Trip BINGO</h2>
                    <p>{from} → {to} • Card {ci + 1} of {cards.length}</p>
                  </div>
                  <div className="print-card" style={{ borderRadius: 12, padding: 16, border: "2px solid #333" }}>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridSize},1fr)`, gap: 4 }}>
                      {card.map((item, i) => {
                        const isFree = gridSize % 2 === 1 && i === Math.floor((gridSize * gridSize) / 2);
                        return (
                          <div key={i} style={{
                            aspectRatio: "1", border: "1.5px solid #ccc", borderRadius: 6,
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            padding: 6, background: isFree ? "#f0e6c8" : "white", textAlign: "center",
                          }}>
                            <div style={{ fontSize: gridSize <= 3 ? 24 : gridSize <= 4 ? 20 : 16, marginBottom: 2 }}>{item.emoji}</div>
                            <div style={{ fontSize: gridSize <= 3 ? 12 : gridSize <= 4 ? 10 : 9, fontWeight: 600, color: "#222", lineHeight: 1.15 }}>
                              {isFree ? `${item.name} (START)` : item.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── FEEDBACK ─── */}
        {phase === "feedback" && (
          <div className="no-print" style={{ maxWidth: 520, margin: "0 auto", padding: "32px 24px" }}>
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
                <button onClick={() => setFbDone(true)} style={{ ...B1(false), marginTop: 24 }}>Submit Feedback</button>
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
