// Use an LRU Cache to prevent memory leaks from unbounded map growth
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
    // Refresh position to indicate recent use
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: string, value: { count: number, timestamp: number }) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Delete oldest entry (first item in insertion order)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
         this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
}

// 10,000 IPs max should be enough for basic rate limiting without blowing up memory
export const rateLimitStore = new LRUCache(10000);

export function checkRateLimit(ip: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  let limitInfo = rateLimitStore.get(ip);
  if (!limitInfo || (now - limitInfo.timestamp > windowMs)) {
    limitInfo = { count: 0, timestamp: now };
  }
  limitInfo.count++;
  rateLimitStore.set(ip, limitInfo);
  return limitInfo.count <= maxRequests;
}
