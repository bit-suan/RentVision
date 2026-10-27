"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";

export default function VerifyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
