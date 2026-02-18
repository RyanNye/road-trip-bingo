import Link from "next/link";

const SF = "'Playfair Display', Georgia, serif";
const F  = "'Source Sans 3', system-ui, sans-serif";

export const metadata = {
  title: "About Highway Bingo — The Road Trip Bingo Card Generator for Families",
  description: "Highway Bingo creates free, custom, printable road trip bingo cards for any driving route — Route 66, I-95, PCH, and beyond. The best car game for kids and teenagers on long drives. No account needed.",
  keywords: "road trip bingo, printable road trip bingo cards, car games for kids, car games for teenagers, family road trip activities, educational road trip, road trip bingo cards free, custom bingo cards, road trip games for families, best car games long drive, road trip activities for kids, printable bingo cards for kids, free road trip bingo, bingo cards for road trips, family travel games, Route 66 bingo, I-95 road trip, cross country road trip games, car activities for long drives, road trip ideas with kids, family vacation games",
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
            The free road trip bingo card generator that gets kids off their screens and onto the scenery — for any route, anywhere in the world.
          </p>
        </div>

        {/* Origin Story */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 20px", color: "#FFF9EE" }}>
            The Car Game That Got My Teenagers to Actually Look Out the Window
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            If you&#39;ve ever been on a long family road trip with teenagers, you know the scene. You&#39;re driving through
            some of the most beautiful scenery on Earth, and every kid in the backseat is staring at a screen. The rolling
            hills, the historic landmarks, the incredible views — all of it completely ignored in favor of whatever&#39;s
            happening on TikTok.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            That was us a couple of years ago, driving through the Italian countryside on what was supposed to be the
            family vacation of a lifetime. We were winding through Tuscany — medieval hilltop villages, ancient stone
            farmhouses, vineyard after vineyard stretching to the horizon — and I kept turning around saying &quot;look at
            THAT&quot; while my teenagers nodded without glancing up.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            So the night before one of our longer driving days, I made a bingo card. Just a simple grid with things I knew
            we&#39;d see: &quot;stone farmhouse,&quot; &quot;cypress tree,&quot; &quot;vineyard on a hillside,&quot;
            &quot;church bell tower,&quot; &quot;field of sunflowers,&quot; &quot;car smaller than our suitcase.&quot;
            A few different versions so each kid had a unique card. The prize: whoever got bingo first earned an extra
            starter turn at that night&#39;s board game.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            I honestly expected eye rolls.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Instead? Within ten minutes, my teenagers were pressed against the windows, actually looking at the Italian
            countryside for the first time all trip. &quot;Is THAT a campanile or just a regular tower?&quot; &quot;Mom,
            does that count as a vineyard or is it an olive grove?&quot; They were asking questions about architecture,
            debating geography, learning without realizing they were learning — which is basically the holy grail of
            family travel.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            We played road trip bingo every single driving day after that. I made new cards each night, tailored to
            whatever region we were driving through next. The Amalfi Coast got different items than the Po Valley. The
            kids started suggesting items themselves. It became one of the highlights of our entire European road trip —
            and we visited the Colosseum, so that&#39;s saying something.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: 0 }}>
            When we got home, I kept thinking: not every parent has the time to research every highway and handwrite
            custom bingo cards the night before a drive. But every family deserves those moments — the ones where
            everyone puts down their phones and actually experiences the journey together. So I built Highway Bingo.
          </p>
        </section>

        {/* What is it */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            What is Highway Bingo?
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Highway Bingo is a free online tool that generates custom, printable road trip bingo cards tailored to any
            specific driving route. Tell us where you&#39;re starting and where you&#39;re headed, and we&#39;ll build
            unique bingo cards filled with things you&#39;re actually likely to spot on <em>that</em> highway — not
            generic &quot;red barn&quot; and &quot;speed limit sign&quot; items that could apply anywhere.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Driving from Chicago to Santa Monica on the old Route 66? Your cards might include the Gateway Arch
            visible from the interstate, wind farms across the Oklahoma panhandle, and the painted desert landscape
            of northern Arizona. Taking a family road trip down I-95 from Boston to Washington, DC? You&#39;ll get
            the New Haven harbor, the George Washington Bridge, the New Jersey Turnpike industrial skyline, and the
            first glimpse of the Capitol dome.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: 0 }}>
            Every card is different so every passenger plays their own board. Each card is a 5×5 printable grid you
            can hand out at the start of the drive. No app, no subscription, no screen required — just paper, pencils,
            and the open road.
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

        {/* Educational angle */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            Educational by accident
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Highway Bingo is sneakily educational. Every route also comes with a guide written for kids — short,
            interesting descriptions of each leg of the journey that a parent can read aloud or a teenager can
            read on their own. Not a textbook. The cool stuff: why the Susquehanna River is older than the
            Atlantic Ocean, how the Pennsylvania Turnpike was America&#39;s first superhighway, why certain towns
            exist where they do.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Our bingo items often include:
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
            Once a kid starts looking out the window for one thing, they start noticing everything. Once they start
            noticing, they start asking questions. Once they start asking questions, you&#39;re having the kind of
            family conversation that makes a road trip actually meaningful.
          </p>
        </section>

        {/* Who it's for */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            Who is it for?
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Highway Bingo works for toddlers, elementary schoolers, middle schoolers, and yes, even teenagers —
            because the magic isn&#39;t the bingo grid, it&#39;s the looking.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "0 0 16px" }}>
            {[
              { label: "Families with young kids", body: "Simple, visual items keep little ones engaged on long drives without a screen in sight." },
              { label: "Road trips with tweens & teens", body: "Competitive scoring and route-specific trivia gives older kids a reason to actually care about where they are." },
              { label: "Cross-country summer road trips", body: "Custom cards for every leg of the drive, so the game stays fresh from day one to day ten." },
              { label: "European & international driving vacations", body: "We support routes worldwide — from the Amalfi Coast to the Great Ocean Road to the Ring of Kerry." },
              { label: "Holiday drives to the grandparents", body: "Even a familiar route is more fun with bingo. Spot the usual landmarks with new eyes every year." },
            ].map(({ label, body }) => (
              <div key={label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ color: "#C4982A", fontSize: 16, flexShrink: 0, marginTop: 1 }}>→</div>
                <div>
                  <span style={{ fontWeight: 700, color: "#FFF9EE", fontSize: 15 }}>{label}: </span>
                  <span style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.7 }}>{body}</span>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: 0 }}>
            Whether you&#39;re planning a cross-country summer road trip, a weekend getaway to the coast, a holiday
            drive to the grandparents&#39; house, or a once-in-a-lifetime European driving vacation — Highway Bingo
            turns windshield time into together time.
          </p>
        </section>

        {/* Free & no account */}
        <section style={{ paddingTop: 44, paddingBottom: 40, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            Free to use. No account needed.
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Highway Bingo is completely free. No account, no login, no email address. Just enter a route,
            generate your cards, and print. You can have a full set of custom road trip bingo cards in under
            a minute.
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

        {/* Who built this */}
        <section style={{ paddingTop: 44, paddingBottom: 60 }}>
          <h2 style={{ fontFamily: SF, fontSize: 26, fontWeight: 700, margin: "0 0 16px", color: "#FFF9EE" }}>
            Who built this?
          </h2>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 16px" }}>
            Highway Bingo is an independent project built by a road trip enthusiast. It started as handwritten
            bingo cards in a Tuscan farmhouse and grew into a tool for any family, on any route, anywhere in
            the world. Because the best part of any family road trip isn&#39;t the destination — it&#39;s what
            you notice along the way.
          </p>
          <p style={{ fontSize: 15, color: "#C5B49A", lineHeight: 1.8, margin: "0 0 28px", fontStyle: "italic" }}>
            Happy travels,<br />
            <span style={{ color: "#A89270" }}>The Highway Bingo Team</span>
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
