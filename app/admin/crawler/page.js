"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const S = {
  page: { minHeight: "100vh", background: "#0d1117", color: "#c9d1d9", fontFamily: "system-ui, sans-serif", padding: "24px" },
  h1:   { color: "#58a6ff", margin: "0 0 4px", fontSize: 22, fontWeight: 700 },
  sub:  { color: "#8b949e", fontSize: 13, margin: "0 0 24px" },
  card: { background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 20, marginBottom: 20 },
  th:   { padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#8b949e", borderBottom: "1px solid #30363d", whiteSpace: "nowrap" },
  td:   { padding: "8px 12px", fontSize: 13, borderBottom: "1px solid #21262d", verticalAlign: "middle" },
  btn:  (color = "#58a6ff") => ({ padding: "6px 14px", background: "transparent", border: `1px solid ${color}`, borderRadius: 6, color, fontSize: 12, fontWeight: 600, cursor: "pointer" }),
  badge: (status) => {
    const map = { complete: ["#238636", "#2ea043"], active: ["#1f4b5f", "#58a6ff"], error: ["#6e1a1a", "#f85149"], queued: ["#2d2d2d", "#8b949e"] };
    const [bg, fg] = map[status] || map.queued;
    return { background: bg, color: fg, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase" };
  },
};

function ProgressBar({ pct, color = "#238636" }) {
  return (
    <div style={{ width: "100%", height: 8, background: "#21262d", borderRadius: 4, overflow: "hidden", minWidth: 80 }}>
      <div style={{ width: `${Math.min(100, pct || 0)}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" }} />
    </div>
  );
}

function StatBox({ label, value, color = "#c9d1d9" }) {
  return (
    <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: "14px 20px", textAlign: "center", minWidth: 110 }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value ?? "—"}</div>
      <div style={{ fontSize: 11, color: "#8b949e", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

function fmt(n) { return n == null ? "—" : Number(n).toLocaleString(); }
function fmtDate(s) { if (!s) return "—"; const d = new Date(s); return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
function pct(crawled, total) { if (!total) return 0; return Math.round((crawled / total) * 100); }

export default function CrawlerDashboard() {
  const router  = useRouter();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [action, setAction]     = useState(null);
  const [filter, setFilter]     = useState("all");
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  const getToken = () => (typeof window !== "undefined" ? sessionStorage.getItem("admin_token") : null);

  const fetchStats = useCallback(async () => {
    const token = getToken();
    if (!token) { router.push("/admin"); return; }
    const res = await fetch("/api/admin/crawler-stats", { headers: { "x-admin-token": token } });
    if (res.status === 401) { router.push("/admin"); return; }
    if (!res.ok) { setError("Failed to load stats"); setLoading(false); return; }
    setData(await res.json());
    setLoading(false);
    setError(null);
  }, [router]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const doControl = async (payload) => {
    const token = getToken();
    setAction(payload.action);
    const res = await fetch("/api/admin/crawler-control", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    setAction(null);
    if (!res.ok) alert(result.error || "Action failed");
    else { await fetchStats(); }
    return result;
  };

  const triggerNow = async () => {
    setTriggering(true); setTriggerResult(null);
    const result = await doControl({ action: "trigger-now" });
    setTriggerResult(result?.cronResult);
    setTriggering(false);
  };

  if (loading) return <div style={S.page}><div style={{ color: "#8b949e", marginTop: 80, textAlign: "center" }}>Loading…</div></div>;
  if (error)   return <div style={S.page}><div style={{ color: "#f85149", marginTop: 80, textAlign: "center" }}>{error}</div></div>;

  const { progress = [], dailyLogs = [], counts = {}, settings = {} } = data || {};

  const todayLog    = dailyLogs[0];
  const totalRoutes = progress.length;
  const doneRoutes  = progress.filter((p) => p.status === "complete").length;
  const activeRoutes= progress.filter((p) => p.status === "active").length;
  const errorRoutes = progress.filter((p) => p.status === "error").length;

  const regions = ["all", ...new Set(progress.map((p) => p.region).filter(Boolean))];
  const filtered = filter === "all" ? progress : progress.filter((p) => p.region === filter);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={S.h1}>Crawler Dashboard</h1>
          <p style={S.sub}>Highway Bingo — Google Places crawler · 3 AM ET daily</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => fetchStats()} style={S.btn()}>↻ Refresh</button>
          <button onClick={triggerNow} disabled={triggering} style={S.btn("#2ea043")}>
            {triggering ? "Running…" : "▶ Run Now"}
          </button>
          <button onClick={() => { sessionStorage.removeItem("admin_token"); router.push("/admin"); }} style={S.btn("#8b949e")}>Sign out</button>
        </div>
      </div>

      {/* Trigger result */}
      {triggerResult && (
        <div style={{ ...S.card, borderColor: "#238636", background: "#0d2318", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#2ea043", fontWeight: 700, marginBottom: 8 }}>Cron run complete</div>
          <pre style={{ margin: 0, fontSize: 12, color: "#c9d1d9", whiteSpace: "pre-wrap" }}>{JSON.stringify(triggerResult, null, 2)}</pre>
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <StatBox label="Total items"     value={fmt(counts.totalItems)}   color="#58a6ff" />
        <StatBox label="Bingo-visible"   value={fmt(counts.visibleItems)} color="#2ea043" />
        <StatBox label="Crawler items"   value={fmt(counts.crawlerItems)} color="#a371f7" />
        <StatBox label="Routes complete" value={`${doneRoutes}/${totalRoutes}`} color="#e3b341" />
        <StatBox label="Today searches"  value={fmt(todayLog?.searches_used)} color="#58a6ff" />
        <StatBox label="Today items"     value={fmt(todayLog?.items_added)}    color="#2ea043" />
        <StatBox label="Today cost"      value={todayLog ? `$${((todayLog.api_cost_cents || 0) / 100).toFixed(2)}` : "—"} color="#f85149" />
      </div>

      {/* Recent daily logs */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#c9d1d9", marginBottom: 14 }}>Recent Daily Logs</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Searches", "Added", "Rejected", "Cost", "Region"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyLogs.slice(0, 7).map((log, i) => (
                <tr key={i}>
                  <td style={S.td}>{log.log_date}</td>
                  <td style={S.td}>{fmt(log.searches_used)}</td>
                  <td style={{ ...S.td, color: "#2ea043" }}>{fmt(log.items_added)}</td>
                  <td style={{ ...S.td, color: "#8b949e" }}>{fmt(log.items_rejected)}</td>
                  <td style={{ ...S.td, color: "#f85149" }}>${((log.api_cost_cents || 0) / 100).toFixed(2)}</td>
                  <td style={{ ...S.td, color: "#8b949e" }}>{log.region || "all"}</td>
                </tr>
              ))}
              {dailyLogs.length === 0 && (
                <tr><td colSpan={6} style={{ ...S.td, color: "#8b949e", textAlign: "center" }}>No logs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Route progress table */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#c9d1d9" }}>Route Progress</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {regions.map((r) => (
              <button key={r} onClick={() => setFilter(r)} style={{
                ...S.btn(filter === r ? "#58a6ff" : "#30363d"),
                background: filter === r ? "rgba(88,166,255,0.1)" : "transparent",
                fontSize: 11, padding: "4px 10px", textTransform: "capitalize",
              }}>{r}</button>
            ))}
          </div>
        </div>

        {activeRoutes > 0 && (
          <div style={{ padding: "8px 12px", background: "rgba(88,166,255,0.08)", borderRadius: 6, fontSize: 12, color: "#58a6ff", marginBottom: 12 }}>
            {activeRoutes} route{activeRoutes > 1 ? "s" : ""} currently active
          </div>
        )}
        {errorRoutes > 0 && (
          <div style={{ padding: "8px 12px", background: "rgba(248,81,73,0.08)", borderRadius: 6, fontSize: 12, color: "#f85149", marginBottom: 12 }}>
            {errorRoutes} route{errorRoutes > 1 ? "s" : ""} in error state
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Route", "Status", "Progress", "Items", "Last position", "Last crawled", "Controls"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const route    = row.routes || {};
                const p        = pct(row.crawled_km, row.total_km);
                const barColor = row.status === "complete" ? "#238636" : row.status === "error" ? "#f85149" : "#58a6ff";
                return (
                  <tr key={row.id}>
                    <td style={{ ...S.td, maxWidth: 200 }}>
                      <div style={{ fontWeight: 600, color: "#c9d1d9", fontSize: 13 }}>{route.corridor_name || "—"}</div>
                      <div style={{ fontSize: 11, color: "#8b949e" }}>{row.region}</div>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(row.status)}>{row.status}</span>
                      {row.error_message && (
                        <div style={{ fontSize: 10, color: "#f85149", marginTop: 4, maxWidth: 140, wordBreak: "break-word" }}>
                          {row.error_message.slice(0, 60)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...S.td, minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>
                        {fmt(row.crawled_km)} / {fmt(row.total_km)} km · {p}%
                      </div>
                      <ProgressBar pct={p} color={barColor} />
                    </td>
                    <td style={S.td}>
                      <div style={{ color: "#2ea043", fontWeight: 600 }}>{fmt(row.items_found)}</div>
                      <div style={{ fontSize: 11, color: "#8b949e" }}>{fmt(row.items_rejected)} rejected</div>
                    </td>
                    <td style={{ ...S.td, fontSize: 12, color: "#8b949e", maxWidth: 160 }}>
                      {row.last_lat && row.last_lng
                        ? `${parseFloat(row.last_lat).toFixed(3)}, ${parseFloat(row.last_lng).toFixed(3)}`
                        : "—"}
                    </td>
                    <td style={{ ...S.td, fontSize: 12, color: "#8b949e", whiteSpace: "nowrap" }}>
                      {fmtDate(row.last_crawled_at)}
                    </td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          disabled={!!action}
                          onClick={() => doControl({ action: "force-crawl", routeId: row.route_id, corridorId: route.corridor_name })}
                          style={{ ...S.btn("#e3b341"), fontSize: 11, padding: "4px 10px" }}
                          title="Reset to start and re-crawl on next run"
                        >
                          ↺ Reset
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ ...S.td, color: "#8b949e", textAlign: "center" }}>No routes found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#8b949e", textAlign: "center" }}>
        Cron: daily at 3 AM ET · Budget: 190 searches/day · 0.75 mi bingo threshold
      </div>
    </div>
  );
}
