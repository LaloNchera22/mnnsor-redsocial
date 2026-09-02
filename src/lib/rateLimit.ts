import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null;

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
  if (redis) {
    try {
      const key = `ratelimit:${ip}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }
      return count <= maxRequests;
    } catch (e) {
      console.error("Redis rate limit error, falling back to memory:", e);
    }
  }

  const now = Date.now();
  let limitInfo = rateLimitStore.get(ip);
  if (!limitInfo || (now - limitInfo.timestamp > windowMs)) {
    limitInfo = { count: 0, timestamp: now };
  }
  limitInfo.count++;
  rateLimitStore.set(ip, limitInfo);
  return limitInfo.count <= maxRequests;
}
