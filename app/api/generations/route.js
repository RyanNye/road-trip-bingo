import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const YEARLY_LIMIT = 10;

export async function GET(request) {
  const uuid = new URL(request.url).searchParams.get("uuid");
  if (!uuid) return NextResponse.json({ error: "uuid required" }, { status: 400 });

  const year = new Date().getFullYear();
  const { data } = await supabaseAdmin
    .from("user_generations")
    .select("count")
    .eq("user_uuid", uuid)
    .eq("year", year)
    .single();

  const used = data?.count || 0;
  return NextResponse.json({ used, remaining: Math.max(0, YEARLY_LIMIT - used), limit: YEARLY_LIMIT });
}

export async function POST(request) {
  const { uuid, count = 1 } = await request.json();
  if (!uuid) return NextResponse.json({ error: "uuid required" }, { status: 400 });

  const year = new Date().getFullYear();

  const { data: existing } = await supabaseAdmin
    .from("user_generations")
    .select("count")
    .eq("user_uuid", uuid)
    .eq("year", year)
    .single();

  const currentCount = existing?.count || 0;

  if (currentCount >= YEARLY_LIMIT) {
    return NextResponse.json(
      { error: "limit_exceeded", remaining: 0, limit: YEARLY_LIMIT },
      { status: 403 }
    );
  }

  const newCount = Math.min(currentCount + count, YEARLY_LIMIT);
  await supabaseAdmin
    .from("user_generations")
    .upsert({ user_uuid: uuid, year, count: newCount }, { onConflict: "user_uuid,year" });

  return NextResponse.json({
    used: newCount,
    remaining: Math.max(0, YEARLY_LIMIT - newCount),
    limit: YEARLY_LIMIT,
  });
}
