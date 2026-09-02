import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error Stripe version is strictly typed, so we force it to match library expectations
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' }) : null;

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Requires a service role key to update user profiles during webhook
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase Service Role Key");
}
const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const isUnderLimit = await checkRateLimit(`webhook_${ip}`, 10, 60000);
  if (!isUnderLimit) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const payload = await req.text();
  const sig = req.headers.get('stripe-signature') as string;

  let event;

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 });
  }

  try {
    if (!endpointSecret) throw new Error('Webhook secret is not set.');
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err: Error | unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const eventId = event.id;
      // Use Supabase for actual idempotency
      if (supabaseAdmin) {
        const { data: existingEvent } = await supabaseAdmin.from('webhook_events').select('id').eq('id', eventId).single();
        if (existingEvent) {
          return NextResponse.json({ received: true, note: 'Already processed' });
        }
        await supabaseAdmin.from('webhook_events').insert([{ id: eventId, type: event.type }]);
      } else {
        return NextResponse.json({ error: 'Supabase Admin not configured, cannot process idempotency' }, { status: 500 });
      }

      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const type = session.metadata?.type;

      if (userId && supabaseAdmin) {
        // Idempotency check could also be added here by checking if the session was already processed
        // For now, we trust Stripe events order, but doing a simple update is idempotent
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

        if (type === 'setup') {
          // Use id instead of anon_id to avoid mismatch issues from client
          await supabaseAdmin.from('profiles').update({ has_paid_setup: true, stripe_customer_id: customerId }).eq('id', userId);
        } else if (type === 'subscription') {
           await supabaseAdmin.from('profiles').update({ is_subscribed: true, stripe_customer_id: customerId }).eq('id', userId);
        }
      } else {
        console.error("Supabase Admin is not available or userId is missing");
        return NextResponse.json({ error: 'Supabase Admin not available' }, { status: 500 });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // Real app handles downgrade using stripe_customer_id
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

      console.log('Subscription deleted for customer:', customerId);
      if (supabaseAdmin && customerId) {
         await supabaseAdmin.from('profiles').update({ is_subscribed: false }).eq('stripe_customer_id', customerId);
      }
      break;
    }
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
