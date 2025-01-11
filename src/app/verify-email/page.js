"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import VerifyEmail from "../components/VerifyEmail";

// Component that uses search params
function VerifyEmailWithParams() {
  const searchParams = useSearchParams();
  return <VerifyEmail token={searchParams.get("token")} />;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailWithParams />
    </Suspense>
  );
}
