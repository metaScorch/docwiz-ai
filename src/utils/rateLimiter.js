import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Create limiters
const globalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10000, "1 d"), // 100000 requests per day globally
  prefix: "ratelimit:global",
});

const userLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 requests per hour per user
  prefix: "ratelimit:user",
});

export async function checkRateLimit(userId) {
  try {
    // Check global rate limit
    const globalLimit = await globalLimiter.limit("global");
    if (!globalLimit.success) {
      const resetInSeconds = Math.max(
        0,
        Math.floor((globalLimit.reset - Date.now()) / 1000)
      );
      return {
        success: false,
        error: "Global rate limit exceeded",
        resetIn: resetInSeconds, // Convert to seconds from now
        limit: 100,
        period: "day",
      };
    }

    // Check user-specific rate limit
    const userLimit = await userLimiter.limit(userId);
    if (!userLimit.success) {
      const resetInSeconds = Math.max(
        0,
        Math.floor((userLimit.reset - Date.now()) / 1000)
      );
      return {
        success: false,
        error: "User rate limit exceeded",
        resetIn: resetInSeconds, // Convert to seconds from now
        limit: 3,
        period: "hour",
      };
    }

    return {
      success: true,
      remaining: {
        user: userLimit.remaining,
        global: globalLimit.remaining,
      },
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

export async function trackAPIUsage({
  userId,
  endpoint,
  tokensUsed,
  cost,
  registrationId,
}) {
  try {
    // Get the registration ID if not provided
    if (!registrationId && userId) {
      const { data: registration } = await supabase
        .from("registrations")
        .select("id")
        .eq("user_id", userId)
        .single();

      registrationId = registration?.id;
    }

    const { error } = await supabase.from("api_usage").insert([
      {
        id: crypto.randomUUID(),
        user_id: userId,
        registration_id: registrationId, // Link to registration
        endpoint,
        tokens_used: tokensUsed,
        cost,
        request_status: "completed",
        timestamp: new Date().toISOString(), // Using timestamp instead of created_at per schema
      },
    ]);

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to track API usage:", error);
  }
}
