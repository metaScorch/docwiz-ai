import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export async function checkDocumentLimit(userId) {
  const supabase = createClientComponentClient();

  try {
    // First get user's registration
    const { data: registration } = await supabase
      .from("registrations")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!registration) {
      throw new Error("No registration found");
    }

    // Check subscription status using registration_id
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("registration_id", registration.id)
      .single();

    // If user has active subscription, no limits
    if (subscription?.status === "active") {
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

    // Count documents created in current cycle
    const { count } = await supabase
      .from("user_documents")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .gte("created_at", cycleStart.toISOString())
      .lt("created_at", cycleEnd.toISOString());

    const FREE_TIER_LIMIT = 3;

    return {
      allowed: count < FREE_TIER_LIMIT,
      currentCount: count,
      limit: FREE_TIER_LIMIT,
      cycleEnd: cycleEnd.toISOString(),
      isPaid: false,
    };
  } catch (error) {
    console.error("Error checking document limit:", error);
    throw error;
  }
}
