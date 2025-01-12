"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

// Check if we're in a browser environment
if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
    capture_pageview: false, // Disable automatic pageview capture
  });
}

export { posthog };
