import { NextResponse } from "next/server";
import { askClaude } from "../../../lib/claude.js";
import { GENERATE_BLURB_SYSTEM, generateBlurbUserPrompt } from "../../../lib/prompts.js";

export async function POST(request) {
  try {
    const { route_name, route_summary, major_waypoints, from, to } = await request.json();

    const userPrompt = generateBlurbUserPrompt({
      route_name,
      route_summary,
      major_waypoints,
      from,
      to,
    });

    const result = await askClaude(GENERATE_BLURB_SYSTEM, userPrompt);

    if (typeof result === "string" || !result?.blurbs) {
      return NextResponse.json({ error: "Failed to parse blurbs" }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("generate-blurb error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
