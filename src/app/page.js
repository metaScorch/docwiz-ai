// src/app/page.js
"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Separate component for handling search params
function SearchParamsHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle any search params logic here
  router.push("/dashboard");
  return null;
}

// Loading component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Main page component
export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SearchParamsHandler />
    </Suspense>
  );
}
