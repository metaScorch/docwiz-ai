import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error('Not authenticated');

    // Get registration record with stripe_customer_id and id
    const { data: registration, error: registrationError } = await supabase
      .from('registrations')
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (registrationError) {
      console.error('Registration error:', registrationError);
      throw new Error('Registration not found');
    }

    console.log('Found registration:', registration);

    // If no Stripe customer exists, create one
    if (!registration.stripe_customer_id) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          registration_id: registration.id,
          user_id: user.id
        }
      });

      console.log('Created Stripe customer:', customer.id);

      // Update registration with new stripe_customer_id
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ 
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', registration.id)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error(`Failed to update registration: ${updateError.message}`);
      }
      
      registration.stripe_customer_id = customer.id;
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: registration.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
    });

    return Response.json({ session_url: session.url });
  } catch (error) {
    console.error('Full error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 400 });
  }
}
