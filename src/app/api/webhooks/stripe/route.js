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
      persistSession: false,
    },
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
      case "customer.subscription.created":
        const newSubscription = event.data.object;

        // Get registration from customer metadata
        const { data: registration, error: registrationError } = await supabase
          .from("registrations")
          .select("id")
          .eq("stripe_customer_id", newSubscription.customer)
          .single();

        if (registrationError || !registration) {
          console.error("Registration lookup error:", registrationError);
          throw new Error(
            "Registration not found for customer: " + newSubscription.customer
          );
        }

        // Create new subscription record
        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            registration_id: registration.id,
            stripe_subscription_id: newSubscription.id,
            status: newSubscription.status,
            current_period_end: new Date(
              newSubscription.current_period_end * 1000
            ),
            cancel_at_period_end: newSubscription.cancel_at_period_end,
            created_at: new Date(),
          });

        if (insertError) {
          console.error("Subscription insert error:", insertError);
          throw new Error("Failed to create subscription record");
        }
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        const subscription = event.data.object;

        // Get registration from customer metadata
        const { data: existingRegistration, error: lookupError } =
          await supabase
            .from("registrations")
            .select("id")
            .eq("stripe_customer_id", subscription.customer)
            .single();

        if (lookupError || !existingRegistration) {
          console.error("Registration lookup error:", lookupError);
          throw new Error(
            "Registration not found for customer: " + subscription.customer
          );
        }

        // Update subscription in database
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("registration_id", existingRegistration.id);

        if (updateError) {
          console.error("Subscription update error:", updateError);
          throw new Error("Failed to update subscription record");
        }
        break;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return Response.json(
      {
        error: error.message,
        details: error.details || "No additional details",
      },
      { status: 400 }
    );
  }
}
