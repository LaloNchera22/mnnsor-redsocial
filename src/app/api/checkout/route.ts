import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error Stripe version is strictly typed, so we force it to match library expectations
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' }) : null;

import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const isUnderLimit = await checkRateLimit(`checkout_${ip}`, 10, 60000);
    if (!isUnderLimit) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { userId, type } = await req.json();

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe configuration missing.' }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let sessionUrl;

    if (type === 'setup') {
      // One-time payment for setup ($5)
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'], // Real implementation might use crypto gateways as mentioned
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Account Setup',
              },
              unit_amount: 500,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?canceled=true`,
        client_reference_id: userId,
        metadata: {
          type: 'setup',
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
