"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function logout() {
    setSubmitting(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return <Button variant="outline" onClick={logout} disabled={submitting}>{submitting ? "Signing out…" : "Sign out"}</Button>;
}
