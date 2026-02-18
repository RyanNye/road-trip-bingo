import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const YEARLY_LIMIT = 10;
const COOKIE_NAME  = "rtb_uid";
const COOKIE_TTL   = 60 * 60 * 24 * 400; // 400 days in seconds

function getOrMakeUuid(request) {
  return request.cookies.get(COOKIE_NAME)?.value || crypto.randomUUID();
}

function stamp(response, uuid) {
  response.cookies.set(COOKIE_NAME, uuid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_TTL,
    path: "/",
  });
  return response;
}

async function getUsed(uuid) {
  const year = new Date().getFullYear();
  const { data } = await supabaseAdmin
    .from("user_generations")
    .select("count")
    .eq("user_uuid", uuid)
    .eq("year", year)
    .single();
  return { year, used: data?.count || 0 };
}

async function getUserTier(uuid) {
  const { data } = await supabaseAdmin
    .from("users")
    .select("tier")
    .eq("user_uuid", uuid)
    .single();
  return data?.tier || "free";
}

export async function GET(request) {
  const uuid = getOrMakeUuid(request);
  const [{ used }, tier] = await Promise.all([getUsed(uuid), getUserTier(uuid)]);
  const isPro = tier === "paid_annual";

  return stamp(
    NextResponse.json({
      remaining: isPro ? null : Math.max(0, YEARLY_LIMIT - used),
      limit: YEARLY_LIMIT,
      tier,
      isPro,
    }),
    uuid
  );
}

export async function POST(request) {
  const { count = 1 } = await request.json();
  const uuid = getOrMakeUuid(request);
  const [{ year, used }, tier] = await Promise.all([getUsed(uuid), getUserTier(uuid)]);
  const isPro = tier === "paid_annual";

  // Pro users have unlimited generations — just record and return
  if (isPro) {
    return stamp(
      NextResponse.json({ remaining: null, limit: YEARLY_LIMIT, tier, isPro }),
      uuid
    );
  }

  if (used >= YEARLY_LIMIT) {
    return stamp(
      NextResponse.json({ error: "limit_exceeded", remaining: 0, limit: YEARLY_LIMIT, tier, isPro }, { status: 403 }),
      uuid
    );
  }

  const newCount = Math.min(used + count, YEARLY_LIMIT);
  await supabaseAdmin
    .from("user_generations")
    .upsert({ user_uuid: uuid, year, count: newCount }, { onConflict: "user_uuid,year" });

  return stamp(
    NextResponse.json({ remaining: Math.max(0, YEARLY_LIMIT - newCount), limit: YEARLY_LIMIT, tier, isPro }),
    uuid
  );
}
