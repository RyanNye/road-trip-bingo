"use client";

import React, { useState, useRef, useEffect } from "react";
import AffiliateButtons from "@/app/components/AffiliateButtons";
import RouteSetupMap from "@/app/components/RouteSetupMap";


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
  .screen-wrapper { display: none !important; }
  .print-page {
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .print-page:last-child { page-break-after: avoid; break-after: avoid; }
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
  .print-output { display: none !important; }
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
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ position: "absolute", fontSize: 52, color: "#FFD700", lineHeight: 1, pointerEvents: "none", userSelect: "none", filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.35))" }}>★</span>
          <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
            <div style={{ fontFamily: BF, fontWeight: 700, fontSize: size <= 3 ? 12 : 10, color: "#FFF", textTransform: "uppercase", lineHeight: 1.1, textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{item?.name}</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.85)", marginTop: 2, textTransform: "uppercase", letterSpacing: 1, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>FREE</div>
          </div>
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
// PRINT CARD CELL (shared for single + multi-leg)
// ═══════════════════════════════════════════════════════════════

function PrintCell({ item, gridSize }) {
  const isFree = item?._isFree;
  return (
    <div style={{
      aspectRatio: "1", border: `1.5px solid ${isFree ? "#888" : "#ccc"}`, borderRadius: 5,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 5, background: isFree ? "#f5ead0" : "white", textAlign: "center",
      position: "relative", overflow: "hidden",
    }}>
      {isFree ? (
        <>
          <span style={{ position: "absolute", fontSize: 84, color: "#FFD700", lineHeight: 1, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>★</span>
          <div style={{ position: "relative", zIndex: 1, fontSize: 20, fontWeight: 700, color: "#111", lineHeight: 1.2 }}>{item.name}</div>
        </>
      ) : (
        <div style={{ fontSize: 20, fontWeight: 600, color: "#111", lineHeight: 1.2 }}>{item.name}</div>
      )}
    </div>
  );
}

function PrintCardPage({ card, gridSize, fromLabel, toLabel, originFlagCode, destFlagCode }) {
  const freeIdx = gridSize % 2 === 1 ? Math.floor((gridSize * gridSize) / 2) : -1;
  const taggedCard = card.map((item, i) => i === freeIdx ? { ...item, _isFree: true } : item);
  return (
    <div className="print-page">
      <div style={{ border: "3px solid #8B6914", borderRadius: 10, overflow: "hidden", width: "100%", background: "white" }}>
        <div className="print-banner" style={{ position: "relative", padding: "14px 20px", borderBottom: "2px solid #8B6914", background: "linear-gradient(135deg, #7A5514, #C4982A)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "absolute", inset: 5, border: "1px solid rgba(255,255,255,0.3)", borderRadius: 5, pointerEvents: "none" }} />
          <FlagSpan code={originFlagCode} />
          <div style={{ flex: 1, textAlign: "center", fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 800, color: "white", lineHeight: 1.25 }}>
            {toTitleCase(fromLabel)} to {toTitleCase(toLabel)} Highway Bingo!
          </div>
          <FlagSpan code={destFlagCode} />
        </div>
        <div style={{ padding: 12, background: "white" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridSize},1fr)`, gap: 4 }}>
            {taggedCard.map((item, i) => <PrintCell key={i} item={item} gridSize={gridSize} />)}
          </div>
        </div>
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
  const [detours, setDetours] = useState([]);
  const gridSize = 5;
  const [numCardsStr, setNumCardsStr] = useState("4");
  const [routeData, setRouteData] = useState(null);

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
  const [genError, setGenError] = useState(null);

  const [fb, setFb] = useState({});
  const [fbNotes, setFbNotes] = useState({});
  const [fbDone, setFbDone] = useState(false);

  // Multi-leg state
  const [legChoice, setLegChoice] = useState(null); // null | "split" | "keep"
  const [legs, setLegs] = useState([]); // [{label, from, to, originFlagCode, destFlagCode, cards, allItems, blurb}]
  const [activeLeg, setActiveLeg] = useState(0);

  const freeItem = { name: "First Pit Stop", emoji: "🚻", desc: "", category: "free", tier: "free" };

  const isLongRoute = routeData && (
    (routeData.estimated_hours != null && routeData.estimated_hours > 5) ||
    (routeData.estimated_miles != null && routeData.estimated_miles > 300)
  );
  const hasSuggestedLegs = routeData?.suggested_legs?.length > 1;

  // Derived active-leg data for the cards page
  const activeCards = legs.length > 0 ? (legs[activeLeg]?.cards || []) : cards;
  const activeAllItems = legs.length > 0 ? (legs[activeLeg]?.allItems || []) : allItems;
  const activeBlurb = legs.length > 0 ? (legs[activeLeg]?.blurb || null) : blurb;
  const activeFrom = legs.length > 0 ? (legs[activeLeg]?.from || from) : from;
  const activeTo = legs.length > 0 ? (legs[activeLeg]?.to || to) : to;
  const activeOriginFlag = legs.length > 0 ? legs[activeLeg]?.originFlagCode : routeData?.origin_flag_code;
  const activeDestFlag = legs.length > 0 ? legs[activeLeg]?.destFlagCode : routeData?.destination_flag_code;

  useEffect(() => {
    const s = localStorage.getItem("rtb_last_session");
    if (s) setReturnBanner(JSON.parse(s));
    // Pre-fill from URL params (e.g. from a route page CTA)
    const params = new URLSearchParams(window.location.search);
    if (params.get("from")) setFrom(params.get("from"));
    if (params.get("to")) setTo(params.get("to"));

  }, []);

  const addCustom = () => {
    if (!ciName.trim()) return;
    setCustomItems((p) => [...p, { name: ciName.trim(), desc: ciDesc.trim(), emoji: "📌", category: "custom", tier: "custom" }]);
    setCiName(""); setCiDesc("");
  };

  const generate = async () => {
    const numCards = Math.min(20, Math.max(1, parseInt(numCardsStr) || 4));
    const isSplit = legChoice === "split" && routeData?.suggested_legs?.length > 1;
    const legsToGenerate = isSplit ? routeData.suggested_legs : null;

    setGenError(null);
    setPhase("generating"); setProgress(0);
    const msgs = ["Checking community database...", "Scanning route corridor...", "Identifying landmarks...", "Balancing categories...", "Creating unique cards...", "Finalizing..."];
    let mi = 0; setLoadMsg(msgs[0]);
    progRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12 + 5, 95));
      mi = Math.min(mi + 1, msgs.length - 1); setLoadMsg(msgs[mi]);
    }, 400);

    try {
      if (isSplit) {
        const generatedLegs = [];
        for (const leg of legsToGenerate) {
          const legWaypoints = (leg.waypoints || []).map((w) => ({ name: w, country: "" }));

          const itemsRes = await fetch("/api/generate-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              route_name: routeData.route_name,
              route_summary: routeData.route_summary,
              major_waypoints: legWaypoints,
              route_coordinates: routeData.route_coordinates,
              _routeId: routeData._routeId,
              from: leg.from,
              to: leg.to,
            }),
          });
          if (!itemsRes.ok) throw new Error(`Item generation failed for: ${leg.label}`);
          const itemsData = await itemsRes.json();

          const pool = [...customItems, ...(itemsData.items || [])];
          const guaranteed = pool.filter((i) => i.tier === "custom" || i.tier === "legendary" || i.tier === "community_verified");
          const built = [];
          for (let i = 0; i < numCards; i++) built.push(buildCard(pool, guaranteed, gridSize, freeItem));

          const legBlurb = await fetch("/api/generate-blurb", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              route_name: routeData.route_name,
              route_summary: routeData.route_summary,
              major_waypoints: legWaypoints,
              from: leg.from,
              to: leg.to,
            }),
          }).then((r) => r.json()).catch(() => null);

          generatedLegs.push({
            label: leg.label,
            from: leg.from,
            to: leg.to,
            originFlagCode: leg.origin_flag_code,
            destFlagCode: leg.destination_flag_code,
            cards: built,
            allItems: pool,
            blurb: legBlurb,
          });
        }

        clearInterval(progRef.current); setProgress(100); setLoadMsg("Done!");
        setLegs(generatedLegs);
        setActiveLeg(0);
        setCards([]);
        setAllItems([]);
        setBlurb(null);
        setActiveCard(0);

        localStorage.setItem("rtb_last_session", JSON.stringify({
          from, to, routeId: routeData._routeId,
          items: generatedLegs[0]?.allItems || [],
        }));
        setTimeout(() => setPhase("cards"), 300);

      } else {
        // Single leg
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

        const pool = [...customItems, ...(data.items || [])];
        setAllItems(pool);
        setLegs([]);

        localStorage.setItem("rtb_last_session", JSON.stringify({
          from, to, routeId: data._routeId, items: pool,
        }));

        clearInterval(progRef.current); setProgress(90); setLoadMsg("Writing your route guide...");

        const blurbData = await fetch("/api/generate-blurb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            route_name: routeData?.route_name,
            route_summary: routeData?.route_summary,
            major_waypoints: routeData?.major_waypoints,
            from, to,
          }),
        }).then((r) => r.json()).catch(() => null);

        setProgress(100); setLoadMsg("Done!");
        setBlurb(blurbData);

        const guaranteed = pool.filter((i) => i.tier === "custom" || i.tier === "legendary" || i.tier === "community_verified");
        const built = [];
        for (let i = 0; i < numCards; i++) built.push(buildCard(pool, guaranteed, gridSize, freeItem));
        setCards(built); setActiveCard(0);
        setTimeout(() => setPhase("cards"), 300);
      }
    } catch (err) {
      clearInterval(progRef.current);
      setGenError(err.message);
      setPhase("custom");
    }
  };

  const handleMissAdd = (newItem) => {
    const tierRank = { generic: 0, ai_generated: 1, listed: 2, community_verified: 3, legendary: 4, custom: 5, free: 6 };
    const center = gridSize % 2 === 1 ? Math.floor((gridSize * gridSize) / 2) : -1;

    const replaceInCards = (prevCards) => {
      let target = null;
      for (const card of prevCards) {
        for (let i = 0; i < card.length; i++) {
          const item = card[i];
          if (i === center || item.tier === "free" || item.tier === "custom") continue;
          if (!target || (tierRank[item.tier] ?? 1) < (tierRank[target.tier] ?? 1)) target = item;
        }
      }
      if (!target) return prevCards;
      return prevCards.map((card) =>
        card.map((item, i) => (i !== center && item.name === target.name ? newItem : item))
      );
    };

    if (legs.length > 0) {
      setLegs((prev) =>
        prev.map((leg, i) => {
          if (i !== activeLeg) return leg;
          return { ...leg, allItems: [...leg.allItems, newItem], cards: replaceInCards(leg.cards) };
        })
      );
    } else {
      setAllItems((prev) => [...prev, newItem]);
      setCards((prev) => replaceInCards(prev));
    }
  };

  const handlePrint = () => window.print();

  const reset = () => {
    setPhase("setup"); setCards([]); setAllItems([]); setCustomItems([]);
    setActiveCard(0); setDetours([]); setRouteData(null); setBlurb(null);
    setLegs([]); setActiveLeg(0); setLegChoice(null); setFbNotes({});
  };

  const handleSubmitFeedback = async () => {
    const items = Object.entries(fb)
      .filter(([, response]) => response)
      .map(([name, response]) => ({ name, response, note: fbNotes[name] || null }));

    const routeId = routeData?._routeId || returnBanner?.routeId || null;

    try {
      await fetch("/api/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, items }),
      });
    } catch (e) {
      console.error("Feedback submit failed:", e);
    }

    localStorage.removeItem("rtb_last_session");
    setReturnBanner(null);
    setFbDone(true);
  };

  return (
    <>
      <style>{PRINT_CSS}</style>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&family=Libre+Baskerville:wght@400;700&display=swap" rel="stylesheet" />

      <div className="screen-wrapper" style={{ minHeight: "100vh", background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)", fontFamily: F, color: "#FFF9EE" }}>
        <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>

        {/* ─── SETUP ─── */}
        {phase === "setup" && (
          <div className="no-print" style={{ maxWidth: 680, margin: "0 auto", padding: "32px clamp(12px,4vw,24px)", width: "100%", boxSizing: "border-box" }}>
            {returnBanner && (
              <div style={{ marginBottom: 20, padding: 16, background: "rgba(196,152,42,0.08)", border: "1px solid rgba(196,152,42,0.2)", borderRadius: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#C4982A", marginBottom: 8 }}>Welcome back! How was your {returnBanner.from} → {returnBanner.to} trip?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setAllItems(returnBanner.items); setFrom(returnBanner.from); setTo(returnBanner.to); setFb({}); setFbNotes({}); setFbDone(false); setPhase("feedback"); }} style={{ ...B2, color: "#C4982A", borderColor: "rgba(196,152,42,0.3)" }}>Leave Feedback</button>
                  <button onClick={() => { localStorage.removeItem("rtb_last_session"); setReturnBanner(null); }} style={B2}>Dismiss</button>
                </div>
              </div>
            )}

            <RouteSetupMap
              from={from}
              to={to}
              detours={detours}
              setFrom={setFrom}
              setTo={setTo}
              setDetours={setDetours}
              onRouteChange={setRouteData}
            />

            {routeData && (
              <div style={{ marginTop: 16, ...BOX }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#A89270", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Route</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{routeData.route_name}</div>
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    {routeData.estimated_miles != null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#C4982A" }}>{routeData.estimated_miles}</div>
                        <div style={{ fontSize: 11, color: "#6B5C48", textTransform: "uppercase", letterSpacing: 1 }}>miles</div>
                      </div>
                    )}
                    {routeData.estimated_hours != null && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#C4982A" }}>{routeData.estimated_hours}</div>
                        <div style={{ fontSize: 11, color: "#6B5C48", textTransform: "uppercase", letterSpacing: 1 }}>hrs</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <label style={L}>How many cards?</label>
              <input type="text" inputMode="numeric" style={IN}
                value={numCardsStr} onChange={(e) => setNumCardsStr(e.target.value)} placeholder="1-20" />
            </div>

            <button onClick={() => setPhase("custom")} disabled={!routeData} style={B1(!routeData)}>
              Next: Add Items →
            </button>

            <div style={{ marginTop: 24, padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#C4982A", marginBottom: 4 }}>💡 Pro tip</div>
              <div style={{ fontSize: 13, color: "#8B7355", lineHeight: 1.5 }}>Whoever gets BINGO first earns a head start on tonight&#39;s board game, first pick of hotel beds, or choice of restaurant!</div>
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
            {/* Long trip prompt */}
            {isLongRoute && hasSuggestedLegs && (
              <div style={{ ...BOX, background: "rgba(196,152,42,0.06)", borderColor: "rgba(196,152,42,0.2)", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#C4982A", marginBottom: 6 }}>🗺️ This is a long trip!</div>
                <div style={{ fontSize: 13, color: "#D4C5A9", lineHeight: 1.6, marginBottom: 12 }}>
                  About{routeData.estimated_hours != null ? ` ${Math.round(routeData.estimated_hours)} hrs` : ""}
                  {routeData.estimated_miles != null ? ` / ${Math.round(routeData.estimated_miles)} mi` : ""} of driving.
                  Want separate bingo cards and route guides for each stretch?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setLegChoice("split")} style={{
                    flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F,
                    background: legChoice === "split" ? "rgba(196,152,42,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${legChoice === "split" ? "rgba(196,152,42,0.5)" : "rgba(255,255,255,0.12)"}`,
                    color: legChoice === "split" ? "#C4982A" : "#A89270",
                  }}>
                    ✓ Yes, split into legs
                  </button>
                  <button onClick={() => setLegChoice("keep")} style={{
                    flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F,
                    background: legChoice === "keep" ? "rgba(196,152,42,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${legChoice === "keep" ? "rgba(196,152,42,0.5)" : "rgba(255,255,255,0.12)"}`,
                    color: legChoice === "keep" ? "#C4982A" : "#A89270",
                  }}>
                    No, one set of cards
                  </button>
                </div>
              </div>
            )}
            {genError && (
              <div style={{ marginBottom: 16, padding: 16, background: "rgba(224,107,143,0.08)", border: "1px solid rgba(224,107,143,0.2)", borderRadius: 10, color: "#E06B8F", fontSize: 14 }}>
                {genError}
                <button onClick={generate} style={{ ...B2, marginTop: 8, width: "100%" }}>Retry</button>
              </div>
            )}
            <button onClick={generate} disabled={isLongRoute && hasSuggestedLegs && !legChoice} style={B1(isLongRoute && hasSuggestedLegs && !legChoice)}>Generate {Math.min(20, Math.max(1, parseInt(numCardsStr) || 4))} Card{Math.min(20, Math.max(1, parseInt(numCardsStr) || 4)) !== 1 ? "s" : ""} 🎲</button>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={() => setPhase("setup")} style={{ background: "none", border: "none", color: "#6B5C48", cursor: "pointer", fontSize: 13 }}>← Back</button>
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
            <div style={{ fontSize: 13, color: "#6B5C48", marginBottom: 20 }}>{from} → {to}</div>
            <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg,#8B6914,#C4982A)", transition: "width 0.3s" }} />
            </div>
          </div>
        )}

        {/* ─── CARDS ─── */}
        {phase === "cards" && (
          <div style={{ padding: 24 }}>
            {/* Leg tabs (multi-leg only) */}
            {legs.length > 0 && (
              <div className="no-print" style={{ maxWidth: 560, margin: "0 auto 16px", width: "100%", display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {legs.map((leg, i) => (
                  <button key={i} onClick={() => { setActiveLeg(i); setActiveCard(0); }} style={{
                    padding: "8px 16px", borderRadius: 100, border: `1px solid ${activeLeg === i ? "#C4982A" : "rgba(255,255,255,0.12)"}`,
                    background: activeLeg === i ? "linear-gradient(135deg,#8B6914,#C4982A)" : "rgba(255,255,255,0.04)",
                    color: activeLeg === i ? "#FFF" : "#6B5C48", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F,
                  }}>
                    {leg.label}
                  </button>
                ))}
              </div>
            )}

            {/* Large route banner */}
            <div className="no-print" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 20px", width: "100%" }}>
              <div style={{ fontFamily: SF, fontSize: "clamp(24px,5vw,36px)", fontWeight: 900, lineHeight: 1.2, paddingBottom: "0.1em", background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>
                {activeFrom.split(",")[0].trim()} to {activeTo.split(",")[0].trim()}
              </div>
              <div style={{ fontSize: 15, color: "#C4982A", fontWeight: 600, marginTop: 4 }}>Route Summary</div>
            </div>

            {/* Active bingo card */}
            <div className="screen-only" style={{ display: "flex", justifyContent: "center", width: "100%", boxSizing: "border-box", marginBottom: 16 }}>
              <BingoCard card={activeCards[activeCard]} size={gridSize} idx={activeCard} total={activeCards.length} key={`card-${activeLeg}-${activeCard}`} />
            </div>

            {/* Card tabs — centered */}
            <div className="no-print" style={{ maxWidth: 560, margin: "0 auto 4px", width: "100%", display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6 }}>
              {activeCards.map((_, i) => (
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
            {activeBlurb?.blurbs?.length > 0 && (
              <div className="no-print" style={{ maxWidth: 560, margin: "16px auto 0" }}>
                {activeBlurb.blurbs.map((b, i) => (
                  <div key={i} style={{ ...BOX, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#C4982A", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{b.leg}</div>
                    <div style={{ fontSize: 13, color: "#D4C5A9", lineHeight: 1.6 }}>{b.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Affiliate buttons */}
            <div className="no-print"><AffiliateButtons /></div>

            {/* Bottom buttons */}
            <div className="no-print" style={{ maxWidth: 560, margin: "8px auto 0", width: "100%", display: "flex", justifyContent: "space-between", gap: 12 }}>
              <button onClick={reset} style={B2}>← New Route</button>
              <button onClick={() => {
                const fbItems = legs.length > 0 ? legs.flatMap((l) => l.allItems) : allItems;
                setAllItems(fbItems);
                setFb({}); setFbNotes({}); setFbDone(false); setPhase("feedback");
              }} style={{ ...B2, color: "#C4982A", borderColor: "rgba(196,152,42,0.3)" }}>Make Corrections</button>
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
                  <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{item.emoji}</span>
                      <div style={{ flex: 1, fontSize: 14 }}>{item.name}</div>
                      {[{ t: "spotted", icon: "👁️" }, { t: "missed", icon: "❌" }, { t: "confusing", icon: "❓" }].map(({ t, icon }) => (
                        <button key={t} onClick={() => setFb((p) => ({ ...p, [item.name]: p[item.name] === t ? null : t }))}
                          style={{ width: 34, height: 34, background: fb[item.name] === t ? "rgba(196,152,42,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${fb[item.name] === t ? "rgba(196,152,42,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {icon}
                        </button>
                      ))}
                    </div>
                    {fb[item.name] === "confusing" && (
                      <div style={{ marginTop: 8, paddingLeft: 38 }}>
                        <input
                          style={{ ...IN, padding: "6px 10px", fontSize: 13 }}
                          placeholder="What was confusing? (optional)"
                          value={fbNotes[item.name] || ""}
                          onChange={(e) => setFbNotes((p) => ({ ...p, [item.name]: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={handleSubmitFeedback} style={{ ...B1(false), marginTop: 24 }}>Submit Feedback</button>
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <button onClick={() => setPhase("cards")} style={{ background: "none", border: "none", color: "#6B5C48", cursor: "pointer", fontSize: 13 }}>← Back to cards</button>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Print output — hidden on screen, visible in print */}
      <div className="print-output">
        {phase === "cards" && (
          legs.length > 0 ? (
            legs.map((leg, li) => (
              <React.Fragment key={li}>
                {/* Title page for every leg (including Leg 1) */}
                <div className="print-page" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "#8B6914", marginBottom: 12 }}>Leg {li + 1}</div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 800, color: "#222" }}>{leg.label}</div>
                    <div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>{leg.from} → {leg.to}</div>
                  </div>
                </div>
                {/* Leg blurb page */}
                {leg.blurb?.blurbs?.length > 0 && (
                  <div className="print-page" style={{ padding: "0.5in", alignItems: "flex-start", justifyContent: "flex-start" }}>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: "#333", marginBottom: 6 }}>
                      Route Guide — {leg.label}
                    </div>
                    <div style={{ fontSize: 13, color: "#666", marginBottom: 24 }}>{leg.from} → {leg.to}</div>
                    {leg.blurb.blurbs.map((b, i) => (
                      <div key={i} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: i < leg.blurb.blurbs.length - 1 ? "1px solid #ddd" : "none" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#8B6914", marginBottom: 6 }}>{b.leg}</div>
                        <div style={{ fontSize: 13, color: "#333", lineHeight: 1.7 }}>{b.description}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Leg cards */}
                {leg.cards.map((card, ci) => (
                  <PrintCardPage key={ci} card={card} gridSize={gridSize}
                    fromLabel={leg.from} toLabel={leg.to}
                    originFlagCode={leg.originFlagCode} destFlagCode={leg.destFlagCode} />
                ))}
              </React.Fragment>
            ))
          ) : (
            <>
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
                <PrintCardPage key={ci} card={card} gridSize={gridSize}
                  fromLabel={from} toLabel={to}
                  originFlagCode={routeData?.origin_flag_code} destFlagCode={routeData?.destination_flag_code} />
              ))}
            </>
          )
        )}
      </div>
    </>
  );
}
