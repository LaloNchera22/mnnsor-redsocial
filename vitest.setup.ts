import { vi } from 'vitest';
process.env.STRIPE_SECRET_KEY = 'mock_stripe_key';
process.env.STRIPE_WEBHOOK_SECRET = 'mock_webhook_secret';
process.env.STRIPE_MONTHLY_PRICE_ID = 'mock_price';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key';

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

if (typeof window !== 'undefined') {
  // Mock Web Crypto API
  Object.defineProperty(window, 'crypto', {
    value: {
      subtle: {
        generateKey: vi.fn(),
        exportKey: vi.fn(),
        importKey: vi.fn(),
        encrypt: vi.fn(),
        decrypt: vi.fn(),
      }
    }
  });

  // Mock Intersection Observer
  class IntersectionObserver {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserver,
  });
}
