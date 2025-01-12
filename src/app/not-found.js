"use client";

import { Suspense } from "react";
import Link from "next/link";

function NotFoundContent() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-2xl">Page Not Found</h2>
        <p className="text-muted-foreground">
          Could not find the requested resource
        </p>
        <Link
          href="/"
          className="inline-block mt-4 text-primary hover:underline"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <NotFoundContent />
    </Suspense>
  );
}
