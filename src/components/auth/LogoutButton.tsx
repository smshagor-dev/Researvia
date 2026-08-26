"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function revokeCurrentDevicePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return;
      await fetch("/api/v1/me/push-subscriptions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      }).catch(() => undefined);
      await subscription.unsubscribe().catch(() => false);
    } catch {
      // Signing out must still succeed if browser push cleanup is unavailable.
    }
  }

  async function logout() {
    setSubmitting(true);
    try {
      await revokeCurrentDevicePush();
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return <Button variant="outline" onClick={logout} disabled={submitting}>{submitting ? "Signing out…" : "Sign out"}</Button>;
}
