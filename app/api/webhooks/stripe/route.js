import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe requires the raw body to verify the webhook signature.
// Next.js App Router exposes request.text() for this.
export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userUuid = session.metadata?.user_uuid;

    if (userUuid) {
      const { error } = await supabaseAdmin
        .from("users")
        .upsert(
          {
            user_uuid: userUuid,
            tier: "paid_annual",
            subscription_start: new Date().toISOString(),
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_uuid" }
        );

      if (error) {
        console.error("Failed to update user tier:", error.message);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }

      console.log(`User ${userUuid} upgraded to paid_annual`);
    }
  }

  // Handle subscription cancellation / expiry
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const { error } = await supabaseAdmin
      .from("users")
      .update({ tier: "free", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", sub.id);

    if (error) console.error("Failed to downgrade user:", error.message);
  }

  return NextResponse.json({ received: true });
}
