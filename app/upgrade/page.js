"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";

const FEATURES = [
  {
    icon: "🗂️",
    label: "Category filtering",
    sub: "Choose what kinds of items appear on your cards — nature, history, weird & fun, and more.",
    soon: true,
  },
  {
    icon: "📖",
    label: "Item descriptions & trivia",
    sub: "Every bingo item comes with a short note about what it is and why it matters.",
    soon: true,
  },
  {
    icon: "🖨️",
    label: "Custom card themes",
    sub: "Pick card colors and styles to match your road trip vibe.",
    soon: true,
  },
  {
    icon: "❤️",
    label: "Support an indie developer",
    sub: "Keep Highway Bingo free for everyone. Your $5 makes a real difference.",
    soon: false,
  },
];

export default function UpgradePage() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      setSuccess(true);
      window.history.replaceState({}, "", "/upgrade");
    }
  }, []);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const { url, error } = await res.json();
      if (url) window.location.href = url;
      else { console.error("Checkout error:", error); setLoading(false); }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)", fontFamily: F, color: "#FFF9EE" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)" }}>

        {/* Back link */}
        <div style={{ paddingTop: 24, paddingBottom: 8 }}>
          <Link href="/" style={{ fontSize: 13, color: "#A89270", textDecoration: "none" }}>← Highway Bingo</Link>
        </div>

        {success ? (
          /* ── Success state ── */
          <div style={{ paddingTop: 60, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
            <h1 style={{ fontFamily: SF, fontSize: "clamp(28px,5vw,38px)", fontWeight: 900, margin: "0 0 12px", background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              You&apos;re now Pro!
            </h1>
            <p style={{ fontSize: 16, color: "#C5B49A", lineHeight: 1.7, margin: "0 0 32px" }}>
              Thanks for supporting Highway Bingo. You&apos;re an early supporter — as new Pro features launch, you&apos;ll get them automatically.
            </p>
            <Link href="/" style={{
              display: "inline-block", padding: "14px 36px",
              background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
              borderRadius: 12, color: "#FFF", fontSize: 15, fontWeight: 700,
              fontFamily: F, textDecoration: "none", textTransform: "uppercase",
              letterSpacing: 2, boxShadow: "0 4px 20px rgba(196,152,42,0.35)",
            }}>
              Generate Cards
            </Link>
          </div>
        ) : (
          /* ── Main upgrade page ── */
          <>
            {/* Hero */}
            <div style={{ paddingTop: 52, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 3, color: "#C4982A", marginBottom: 14 }}>
                Early Supporter Deal
              </div>
              <h1 style={{ fontFamily: SF, fontSize: "clamp(28px,5vw,42px)", fontWeight: 900, margin: "0 0 16px", lineHeight: 1.15, background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Highway Bingo Pro
              </h1>
              <p style={{ fontSize: 16, color: "#C5B49A", lineHeight: 1.75, margin: "0 0 8px" }}>
                Highway Bingo is free — and always will be. Pro is for people who want to support the project and unlock premium features as they launch.
              </p>
              <p style={{ fontSize: 14, color: "#8B7355", lineHeight: 1.65, margin: 0 }}>
                At <strong style={{ color: "#C4982A" }}>$5/year</strong>, you&apos;re locking in the early-supporter rate before features ship.
              </p>
            </div>

            {/* Features */}
            <div style={{ paddingTop: 36, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 style={{ fontFamily: SF, fontSize: 22, fontWeight: 700, margin: "0 0 24px", color: "#FFF9EE" }}>What you get</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {FEATURES.map(({ icon, label, sub, soon }) => (
                  <div key={label} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1.2 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#FFF9EE" }}>{label}</span>
                        {soon && (
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#C4982A", background: "rgba(196,152,42,0.12)", border: "1px solid rgba(196,152,42,0.25)", borderRadius: 4, padding: "1px 6px" }}>
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: "#8B7355", lineHeight: 1.55 }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Free tier reminder */}
            <div style={{ paddingTop: 28, paddingBottom: 28, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#A89270", marginBottom: 4 }}>Free tier — always available</div>
                <div style={{ fontSize: 13, color: "#6B5C48", lineHeight: 1.55 }}>
                  Unlimited bingo card generations, any route in the world, no account needed. That never changes.
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ paddingTop: 36, paddingBottom: 60, textAlign: "center" }}>
              <button
                onClick={startCheckout}
                disabled={loading}
                style={{
                  width: "100%", padding: "16px 0",
                  background: loading ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
                  border: "none", borderRadius: 12, color: loading ? "#6B5C48" : "#FFF",
                  fontSize: 16, fontWeight: 700, fontFamily: F, cursor: loading ? "not-allowed" : "pointer",
                  textTransform: "uppercase", letterSpacing: 2,
                  boxShadow: loading ? "none" : "0 4px 20px rgba(196,152,42,0.35)",
                }}
              >
                {loading ? "Redirecting..." : "Upgrade to Pro — $5/year"}
              </button>
              <div style={{ marginTop: 12, fontSize: 12, color: "#4A3728" }}>
                Secured by Stripe · Cancel anytime
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
