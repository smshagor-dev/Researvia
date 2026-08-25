"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function NotificationActions({ id, all = false }: { id?: string; all?: boolean }) {
  const router = useRouter();
  async function mark() {
    await fetch("/api/v1/me/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(all ? { all: true } : { id }) });
    router.refresh();
  }
  return <Button type="button" variant="secondary" onClick={() => void mark()}>{all ? "Mark all read" : "Mark read"}</Button>;
}
