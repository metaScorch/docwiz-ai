import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export async function checkDocumentLimit(userId) {
  try {
    const supabase = createClientComponentClient();

    // Get the most recent registration
    const { data: registrations, error: regError } = await supabase
      .from("registrations")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (regError) throw new Error("Error fetching registration");
    if (!registrations || registrations.length === 0) {
      throw new Error("No registration found");
    }

    // Use the most recent registration
    const registrationId = registrations[0].id;

    // Get document count
    const { count, error: countError } = await supabase
      .from("user_documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) throw countError;

    const FREE_TIER_LIMIT = 3;
    const isWithinLimit = count < FREE_TIER_LIMIT;

    return {
      allowed: isWithinLimit,
      current: count,
      limit: FREE_TIER_LIMIT,
      remaining: Math.max(0, FREE_TIER_LIMIT - count),
    };
  } catch (error) {
    console.error("Error checking document limit:", error);
    throw error;
  }
}
