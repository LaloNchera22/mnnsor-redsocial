import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_12345', {
  apiVersion: '2026-08-26.dahlia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Requires a service role key to update user profiles during webhook
const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : supabase;

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event;

  try {
    if (!endpointSecret) throw new Error('Webhook secret is not set.');
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const type = session.metadata?.type;

      if (userId && supabaseAdmin) {
        if (type === 'setup') {
          await supabaseAdmin.from('profiles').update({ has_paid_setup: true }).eq('anon_id', userId);
        } else if (type === 'subscription') {
           await supabaseAdmin.from('profiles').update({ is_subscribed: true }).eq('anon_id', userId);
        }
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // In a real app, you would look up the user by customer ID
      // and update their subscription status.
      // Here, we just log it.
      console.log('Subscription deleted:', subscription.id);
      break;
    }
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
