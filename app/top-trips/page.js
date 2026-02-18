import Link from "next/link";
import TopTripsGrid from "./TopTripsGrid";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";

export const metadata = {
  title: "Top Road Trips by Region — Highway Bingo",
  description: "Discover the most popular road trips in North America, Europe, Latin America, Africa, Australia, and Asia. Updated daily.",
};

export default function TopTripsIndex() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)",
      fontFamily: F, color: "#FFF9EE",
    }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 760, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)" }}>

        <div style={{ paddingTop: 48, paddingBottom: 36, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#C4982A", letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
            Updated Daily
          </div>
          <h1 style={{
            fontFamily: SF, fontSize: "clamp(28px,5vw,46px)", fontWeight: 900, margin: "0 0 14px",
            background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Top Road Trips
          </h1>
          <p style={{ fontSize: 16, color: "#8B7355", margin: 0, lineHeight: 1.65 }}>
            The most-played routes on Highway Bingo, ranked by region. Rankings refresh every morning.
          </p>
        </div>

        <div style={{ paddingTop: 36, paddingBottom: 60 }}>
          <TopTripsGrid />
        </div>

      </div>
    </div>
  );
}
