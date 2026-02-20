import { NextResponse } from "next/server";

export async function POST(request) {
  const { password } = await request.json();
  const correct = process.env.ADMIN_PASSWORD;
  if (!correct) return NextResponse.json({ error: "ADMIN_PASSWORD not set" }, { status: 500 });
  if (password !== correct) return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  return NextResponse.json({ token: Buffer.from(correct).toString("base64") });
}
