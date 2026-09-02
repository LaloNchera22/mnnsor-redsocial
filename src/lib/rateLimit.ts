import { Redis } from '@upstash/redis'
import { supabase } from './supabase';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null;

export async function checkRateLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): Promise<boolean> {
  if (redis) {
    try {
      const key = `ratelimit:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      return count <= maxRequests;
    } catch (e) {
      console.error("Redis rate limit error, falling back to database/memory:", e);
    }
  }
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
    // Serverless fallback handling
    console.warn("Distributed rate limiting requires Redis or Supabase. Failing open safely.");
    return true;
  }
}
