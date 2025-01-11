"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import VerifyEmail from "../components/VerifyEmail";

function VerifyEmailWithParams() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  return <VerifyEmail initialEmail={email} />;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailWithParams />
    </Suspense>
  );
}
