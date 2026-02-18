import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// This endpoint now only checks whether the user is a Pro subscriber.
// Generation counting and limits have been removed — all core features are free.

const COOKIE_NAME = "rtb_uid";
const COOKIE_TTL  = 60 * 60 * 24 * 400; // 400 days

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
  const tier = await getUserTier(uuid);
  const isPro = tier === "paid_annual";
  return stamp(NextResponse.json({ tier, isPro }), uuid);
}
