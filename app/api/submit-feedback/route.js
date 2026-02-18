import { NextResponse } from "next/server";
import { submitFeedback } from "@/lib/db";

export async function POST(req) {
  try {
    const { routeId, items } = await req.json();
    await submitFeedback({ routeId, items });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("submit-feedback error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
