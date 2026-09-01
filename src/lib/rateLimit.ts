import { supabase } from './supabase';

// Use an LRU Cache as fallback if Supabase is not available
class LRUCache {
  private capacity: number;
  private cache: Map<string, { count: number, timestamp: number }>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: string) {
    if (!this.cache.has(key)) return null;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: { count: number, timestamp: number }) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
         this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

export const rateLimitStore = new LRUCache(10000);

export async function checkRateLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): Promise<boolean> {
  const now = Date.now();

  if (supabase) {
    // Distributed rate limit using Supabase RPC to avoid race conditions and RLS blocks
    const { data: newCount, error } = await supabase.rpc('increment_rate_limit', { client_ip: ip, window_ms: windowMs });

    if (error) {
       console.error("Rate limit RPC error:", error);
       return true; // fail-open for rate limiting to not block users on DB error
    }

    return newCount <= maxRequests;
  } else {
    // In-memory fallback
    let limitInfo = rateLimitStore.get(ip);
    if (!limitInfo || (now - limitInfo.timestamp > windowMs)) {
      limitInfo = { count: 0, timestamp: now };
    }
    limitInfo.count++;
    rateLimitStore.set(ip, limitInfo);
    return limitInfo.count <= maxRequests;
  }
}
