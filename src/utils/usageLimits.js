import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export async function checkDocumentLimit(userId) {
  const supabase = createClientComponentClient();

  try {
    // First check if user has a paid subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, plan")
      .eq("user_id", userId)
      .single();

    // If user has active paid subscription, no limits
    if (subscription?.status === "active" && subscription?.plan !== "free") {
      return {
        allowed: true,
        currentCount: 0,
        limit: Infinity,
        cycleEnd: null,
        isPaid: true,
      };
    }

    // Get user's creation date for billing cycle calculation
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Failed to get user data");
    }

    const userCreatedAt = new Date(user.created_at);
    const now = new Date();

    // Calculate current billing cycle
    const cycleStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      userCreatedAt.getDate()
    );
    if (cycleStart > now) {
      cycleStart.setMonth(cycleStart.getMonth() - 1);
    }

    // Calculate cycle end
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);

    // Get document count for current billing cycle
    const { count, error } = await supabase
      .from("user_documents")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .gte("created_at", cycleStart.toISOString())
      .lt("created_at", cycleEnd.toISOString());

    if (error) {
      console.error("Error getting document count:", error);
      throw error;
    }

    const FREE_PLAN_LIMIT = 12;
    const currentCount = count || 0;

    return {
      allowed: currentCount < FREE_PLAN_LIMIT,
      currentCount,
      limit: FREE_PLAN_LIMIT,
      cycleEnd,
      isPaid: false,
    };
  } catch (error) {
    console.error("Error checking document limit:", error);
    throw new Error("Failed to check document limit: " + error.message);
  }
}
