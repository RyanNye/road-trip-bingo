import Link from "next/link";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";

export const metadata = {
  title: "About Highway Bingo — Free Printable Road Trip Bingo Cards",
  description: "Highway Bingo generates custom, printable road trip bingo cards for any driving route. Free car games for kids and families. No account needed.",
  keywords: "road trip bingo, printable bingo cards, car games for kids, family road trip game, highway bingo, travel bingo, educational road trip",
};

export default function AboutPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(165deg,#2C1810,#4A3728 40%,#3D2E1C)",
      fontFamily: F, color: "#FFF9EE",
    }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={{ position: "fixed", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(255,255,255,0.015) 40px,rgba(255,255,255,0.015) 41px)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)" }}>

        {/* Hero */}
        <div style={{ paddingTop: 52, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 style={{
            fontFamily: SF, fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, margin: "0 0 16px",
            background: "linear-gradient(180deg,#FFF9EE,#D4C5A9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            About Highway Bingo
          </h1>
          <p style={{ fontSize: 17, color: "#D4C5A9", margin: 0, lineHeight: 1.75 }}>
            The free road trip bingo card generator that turns any drive into a family adventure.
          </p>
        </div>

        {/* What is it */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            What is Highway Bingo?
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Highway Bingo is a free online tool that generates custom, printable bingo cards
            tailored to any specific road trip route. Tell us where you&#39;re starting and where you&#39;re
            headed, and we&#39;ll build unique bingo cards filled with things you&#39;re actually likely
            to spot on <em>that</em> highway — not generic cards you could use anywhere.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: 0 }}>
            Every card is different, so every passenger can play their own board. Each card is also a
            5×5 printable grid you can hand out at the start of the drive. No app, no screen — just paper and fun.
          </p>
        </section>

        {/* How it works */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 20px", color: "#FFF9EE" }}>
            How it works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              {
                step: "1",
                title: "Enter your route",
                body: "Type your starting city and destination. We support routes anywhere in the world — US highways, European motorways, Australian coastal roads, and more.",
              },
              {
                step: "2",
                title: "We analyze the drive",
                body: "Our AI studies your specific corridor: the states or countries you'll pass through, common landmarks, regional wildlife, local culture, and road-specific sights.",
              },
              {
                step: "3",
                title: "Unique cards, every time",
                body: "We generate as many bingo cards as you need — each one randomized from a pool of 36+ route-specific items. No two cards are alike.",
              },
              {
                step: "4",
                title: "Print and play",
                body: "Hit Print and hand out the cards. First to fill a row, column, or diagonal wins — or play Blackout for the full game.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                <div style={{
                  fontFamily: SF, fontSize: 22, fontWeight: 900, color: "#C4982A",
                  minWidth: 32, flexShrink: 0, lineHeight: 1,
                }}>
                  {step}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#FFF9EE", marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 14, color: "#8B7355", lineHeight: 1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            Why road trip bingo?
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Long drives with kids can be exhausting. Generic car games like &quot;I Spy&quot; or alphabet games
            wear thin fast. Road trip bingo cards give kids a structured, exciting goal — and because
            ours are route-specific, children naturally start paying attention to their surroundings.
            They&#39;ll notice a water tower, a covered bridge, or a state welcome sign they&#39;d have
            ignored otherwise.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: 0 }}>
            For older kids and adults, it&#39;s a surprisingly competitive game. For families with
            younger children, it&#39;s a low-effort way to make the drive feel like part of the adventure
            rather than time to kill.
          </p>
        </section>

        {/* Educational angle */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            Educational by accident
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Highway Bingo is sneakily educational. Our bingo items often include:
          </p>
          <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
            {[
              "Historical landmarks and monuments specific to the route",
              "Native plants and wildlife along that corridor",
              "Regional architecture, agriculture, and industry",
              "State and county geography (rivers, mountain ranges, state lines)",
              "Cultural sites and local traditions",
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, marginBottom: 4 }}>
                {item}
              </li>
            ))}
          </ul>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: 0 }}>
            Kids ask questions. Conversations happen. That&#39;s the best kind of car game.
          </p>
        </section>

        {/* Free & no account */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            Free to use. No account needed.
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Highway Bingo is completely free. You don&#39;t need to create an account, log in, or provide
            an email address. Just enter a route, generate your cards, and print.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: 0 }}>
            If you find it useful, consider{" "}
            <a href="https://buymeacoffee.com/highwaybingo" target="_blank" rel="noopener noreferrer"
              style={{ color: "#C4982A", textDecoration: "none" }}>
              buying me a coffee
            </a>
            {" "}— it helps keep the site running and the AI models trained. But no pressure at all.
          </p>
        </section>

        {/* Contact / built by */}
        <section style={{ paddingTop: 44, paddingBottom: 60 }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            Who built this?
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 24px" }}>
            Highway Bingo is an independent side project built by a road trip enthusiast.
            It started as a tool for my own family drives and grew from there.
            If you have feedback, found a bug, or want a specific route added, feel free to reach out.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/" style={{
              display: "inline-block", padding: "12px 28px",
              background: "linear-gradient(135deg,#8B6914,#C4982A 50%,#8B6914)",
              borderRadius: 10, color: "#FFF", fontSize: 14, fontWeight: 700,
              fontFamily: F, textDecoration: "none", textTransform: "uppercase", letterSpacing: 1.5,
              boxShadow: "0 4px 16px rgba(196,152,42,0.3)",
            }}>
              Generate Bingo Cards
            </Link>
            <Link href="/examples" style={{
              display: "inline-block", padding: "12px 28px",
              background: "rgba(196,152,42,0.12)", border: "1px solid rgba(196,152,42,0.3)",
              borderRadius: 10, color: "#C4982A", fontSize: 14, fontWeight: 700,
              fontFamily: F, textDecoration: "none",
            }}>
              Browse Examples
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
