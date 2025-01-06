import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { email, userId } = await req.json();

    // Verify the user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session || session.user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId: userId,
      },
    });

    return NextResponse.json({ customerId: customer.id });
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
