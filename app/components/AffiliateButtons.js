"use client";

const F = "'Source Sans 3', system-ui, sans-serif";

const BUTTONS = [
  {
    label: "Road Trip Essentials — Screen-Free Fun",
    href: "https://amzn.to/40h6PBP",
  },
  {
    label: "Or... Just Give Them What They Want",
    href: "https://amzn.to/46dsX3B",
  },
];

export default function AffiliateButtons() {
  return (
    <div style={{
      maxWidth: 560, margin: "0 auto", padding: "24px 0 8px",
      display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center",
    }}>
      {BUTTONS.map(({ label, href }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "9px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: "#8B7355",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: F,
            textDecoration: "none",
            letterSpacing: 0.2,
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "rgba(196,152,42,0.3)";
            e.currentTarget.style.color = "#C4982A";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#8B7355";
          }}
        >
          🛒 {label}
        </a>
      ))}
      <div style={{
        width: "100%", textAlign: "center",
        fontSize: 10, color: "#4A3728", fontStyle: "italic", fontFamily: F, marginTop: 4,
      }}>
        As an Amazon Associate, Highway Bingo earns from qualifying purchases.
      </div>
    </div>
  );
}
