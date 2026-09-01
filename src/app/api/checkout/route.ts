import { NextResponse } from 'next/server';
import Stripe from 'stripe';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build', {
  apiVersion: '2026-08-26.dahlia' // use a stable valid version type for Stripe SDK
});

export async function POST(req: Request) {
  try {
    const { userId, type } = await req.json();

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration missing.' }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let sessionUrl;

    if (type === 'setup') {
      // One-time payment for setup ($10)
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'], // Real implementation might use crypto gateways as mentioned
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Account Setup',
              },
              unit_amount: 1000,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/feed?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`,
        client_reference_id: userId,
        metadata: {
          type: 'setup',
          userId,
        },
      });
      sessionUrl = session.url;
    } else if (type === 'subscription') {
      if (!process.env.STRIPE_MONTHLY_PRICE_ID) {
        return NextResponse.json({ error: 'Monthly price ID is not configured.' }, { status: 500 });
      }
      // Monthly subscription ($5)
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_MONTHLY_PRICE_ID, // Use a price ID from Stripe Dashboard
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/feed?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`,
        client_reference_id: userId,
        metadata: {
          type: 'subscription',
          userId,
        },
      });
      sessionUrl = session.url;
    }

    return NextResponse.json({ url: sessionUrl });
  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating checkout session:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
