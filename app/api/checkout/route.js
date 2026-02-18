import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const COOKIE_NAME = "rtb_uid";

export async function POST(request) {
  try {
    const uuid = request.cookies.get(COOKIE_NAME)?.value;
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Use a pre-created Price ID if available, otherwise define inline.
    // To create one: Stripe Dashboard → Products → Add product → Add price ($5/year recurring).
    // Then set STRIPE_PRICE_ID in your env vars.
    const lineItem = process.env.STRIPE_PRICE_ID
      ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product_data: { name: "Highway Bingo Pro" },
            unit_amount: 500,
            recurring: { interval: "year" },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [lineItem],
      success_url: `${origin}/?upgraded=1`,
      cancel_url: `${origin}/`,
      metadata: { user_uuid: uuid || "" },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
