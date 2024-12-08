"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRegistrations() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Handle not authenticated state
          return;
        }

        const { data, error } = await supabase
          .from("registrations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRegistrations(data || []);
      } catch (error) {
        console.error("Error fetching registrations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRegistrations();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Registrations</h1>

      {registrations.length === 0 ? (
        <p className="text-gray-500">No registrations found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {registrations.map((registration) => (
            <div
              key={registration.id}
              className="p-4 border rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg">
                {registration.entity_name}
              </h2>
              <p className="text-sm text-gray-600">
                Type: {registration.registration_type}
              </p>
              <p className="text-sm text-gray-600">
                Location: {registration.country_name}
                {registration.state_name && `, ${registration.state_name}`}
                {registration.city_name && `, ${registration.city_name}`}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Created:{" "}
                {new Date(registration.created_at).toLocaleDateString()}
              </p>
              {/* Add more registration details as needed */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
