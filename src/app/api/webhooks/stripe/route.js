import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req) {
  const body = await req.text();
  const sig = headers().get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return Response.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        const subscription = event.data.object;
        
        // Get registration from customer metadata
        const { data: registration } = await supabase
          .from("registrations")
          .select("id")
          .eq("stripe_customer_id", subscription.customer)
          .single();

        if (!registration) {
          throw new Error("Registration not found");
        }

        // Update subscription in database
        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("registration_id", registration.id);

        break;
      
      // Add other event types as needed
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return Response.json({ error: error.message }, { status: 400 });
  }
}
