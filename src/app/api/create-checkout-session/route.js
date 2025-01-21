import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Default to localhost if NEXT_PUBLIC_SITE_URL is not set
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(req) {
  try {
    const { priceId, customerId, successUrl, cancelUrl } = await req.json();

    if (!priceId || !customerId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("Creating checkout session with:", {
      priceId,
      customerId,
      successUrl,
      cancelUrl,
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      {
        error: "Error creating checkout session",
        details: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
