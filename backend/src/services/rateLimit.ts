import { redisConnection } from '../queue/emailQueue.js';
import { env } from '../config/env.js';

// Lua script for atomic rate limit consumption
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = tonumber(redis.call('get', key) or "0")
if current >= limit then
  return {0, current}
end

local newVal = redis.call('incr', key)
if newVal == 1 then
  redis.call('expire', key, ttl)
end

return {1, newVal}
`;

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  resetDelayMs: number;
}

/**
 * Atomic Redis-backed rate limiting per sender per hour window.
 */
export async function checkAndConsumeRateLimit(
  senderId: string,
  customHourlyLimit?: number
): Promise<RateLimitResult> {
  const limit = customHourlyLimit && customHourlyLimit > 0 ? customHourlyLimit : env.MAX_EMAILS_PER_HOUR_PER_SENDER;
  const now = Date.now();
  const hourWindow = Math.floor(now / 3_600_000);
  const nextHourTimestamp = (hourWindow + 1) * 3_600_000;
  // Calculate remaining seconds in the current hour window
  const ttlSeconds = Math.max(1, Math.ceil((nextHourTimestamp - now) / 1000));
  const resetDelayMs = Math.max(1000, nextHourTimestamp - now);

  const key = `rate_limit:${senderId}:${hourWindow}`;

  // Execute atomic Lua script
  const result = (await redisConnection.eval(
    RATE_LIMIT_LUA,
    1,
    key,
    limit.toString(),
    ttlSeconds.toString()
  )) as [number, number];

  const allowed = result[0] === 1;
  const currentCount = result[1];

  return {
    allowed,
    currentCount,
    limit,
    resetDelayMs,
  };
}
