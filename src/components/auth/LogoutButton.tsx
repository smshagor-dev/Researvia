"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);

  async function logout() {
    setSubmitting(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return <Button variant="outline" onClick={logout} disabled={submitting}>{submitting ? "Signing out…" : "Sign out"}</Button>;
}
