"use client";

import { PostHogProvider as Provider } from "posthog-js/react";
import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function PostHogProvider({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return <Provider client={posthog}>{children}</Provider>;
} 