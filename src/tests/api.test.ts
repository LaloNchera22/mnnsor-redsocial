import { describe, it, expect, vi } from 'vitest';
import { POST as checkoutRoute } from '@/app/api/checkout/route';
import { POST as webhookRoute } from '@/app/api/webhook/route';
import { POST as rateLimitRoute } from '@/app/api/rate-limit/route';

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true)
}));

vi.mock('stripe', () => {
  const stripeClass = class MockStripe {
    checkout = {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'http://mock.url' })
      }
    };
    webhooks = {
      constructEvent: () => { throw new Error('invalid signature'); }
    };
  };
  return { default: stripeClass };
});

describe('API Routes', () => {
  const createMockRequest = (body: unknown, headers = new Map()) => {
    return {
      json: async () => body,
      text: async () => JSON.stringify(body),
      headers: {
        get: (key: string) => headers.get(key)
      }
    } as unknown as Request;
  };



  it('Checkout API should return 400 if userId is missing', async () => {
    const req = createMockRequest({ type: 'setup' });
    const res = await checkoutRoute(req);
    expect(res.status).toBe(400);
  });

  it('Webhook API should return 400 on invalid signature', async () => {
    const headers = new Map();
    headers.set('stripe-signature', 'invalid');
    const req = createMockRequest({}, headers);
    const res = await webhookRoute(req);
    expect(res.status).toBe(400);
  });

  it('Rate limit API should return 200 ok when limit is not exceeded', async () => {
    const req = createMockRequest({ action: 'post' });
    const res = await rateLimitRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
