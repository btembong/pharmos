import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

const isConfigured = !!(url && token);

// No-op stub used when Redis credentials are not configured (local dev without Redis)
const noopRedis = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 0,
  setex: async () => 'OK',
} as unknown as Redis;

export const redis: Redis = isConfigured
  ? new Redis({ url: url!, token: token! })
  : noopRedis;
