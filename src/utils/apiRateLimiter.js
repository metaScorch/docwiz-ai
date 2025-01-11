import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Create limiters for business info API
const businessInfoLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 d"), // 3 requests per day per user
  prefix: "ratelimit:business-info",
});

export async function checkBusinessInfoRateLimit(userId) {
  try {
    const limit = await businessInfoLimiter.limit(userId);

    if (!limit.success) {
      const resetInSeconds = Math.max(
        0,
        Math.floor((limit.reset - Date.now()) / 1000)
      );
      return {
        success: false,
        error: "Rate limit exceeded for business info API",
        resetIn: resetInSeconds,
        limit: 3,
        period: "day",
      };
    }

    return {
      success: true,
      remaining: limit.remaining,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    return {
      success: false,
      error: "Rate limit check failed",
      resetIn: 3600,
    };
  }
}
