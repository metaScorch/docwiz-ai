"use client";

import VerifyEmail from "../components/VerifyEmail";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return <VerifyEmail initialEmail={email} />;
}
