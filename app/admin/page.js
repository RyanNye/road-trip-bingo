"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [pw, setPw]       = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      const { token } = await res.json();
      sessionStorage.setItem("admin_token", token);
      router.push("/admin/crawler");
    } else {
      setError("Wrong password");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={login} style={{ background: "#16213e", padding: 40, borderRadius: 12, border: "1px solid #0f3460", width: 320 }}>
        <h1 style={{ color: "#e94560", margin: "0 0 24px", fontSize: 22, fontWeight: 700 }}>Admin</h1>
        <input
          type="password" value={pw} onChange={(e) => setPw(e.target.value)}
          placeholder="Password" autoFocus
          style={{ width: "100%", padding: "12px 14px", background: "#0f3460", border: "1px solid #1a4a7a", borderRadius: 8, color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
        />
        {error && <div style={{ color: "#e94560", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button type="submit" disabled={loading || !pw}
          style={{ width: "100%", padding: "12px", background: loading ? "#333" : "#e94560", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
