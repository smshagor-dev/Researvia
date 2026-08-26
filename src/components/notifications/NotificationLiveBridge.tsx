"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type LiveNotification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

const SEEN_KEY = "researvia.seen-live-notifications";
const POLL_MS = 45_000;

function loadSeen() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function persistSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-100)));
  } catch {
    // Session storage can be unavailable in hardened/private browser modes.
  }
}

export function NotificationLiveBridge() {
  const [toast, setToast] = useState<LiveNotification | null>(null);
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (!active) return;
      try {
        const response = await fetch("/api/v1/me/notifications?unreadOnly=true&limit=12", { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { data?: { items?: LiveNotification[]; unread?: number } };
        const items = body.data?.items ?? [];
        const unread = Number(body.data?.unread ?? 0);
        window.dispatchEvent(new CustomEvent("researvia:unread-notifications", { detail: unread }));

        if (!seenRef.current) seenRef.current = loadSeen();
        const seen = seenRef.current;
        const next = items.find((item) => ["PROFESSOR_MATCH", "SYSTEM_MAIL"].includes(item.type) && !seen.has(String(item._id)));
        for (const item of items) seen.add(String(item._id));
        persistSeen(seen);
        if (next && document.visibilityState === "visible") setToast(next);
      } catch {
        // Polling is a best-effort web notification fallback; the durable inbox remains authoritative.
      }
    }

    void poll();
    timer = setInterval(() => void poll(), POLL_MS);
    const onVisibility = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!toast) return null;
  const isMail = toast.type === "SYSTEM_MAIL";
  const score = !isMail && typeof toast.metadata?.matchScore === "number" ? toast.metadata.matchScore : null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,390px)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl" role="status" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isMail ? "New email" : "New professor match"}</p>
            {score !== null ? <span className="rounded-full bg-slate-950 px-2 py-0.5 text-xs font-semibold text-white">{score}%</span> : null}
          </div>
          <h2 className="mt-1 font-semibold text-slate-950">{toast.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{toast.message}</p>
        </div>
        <button type="button" onClick={() => setToast(null)} className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss notification">×</button>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Link href="/dashboard/notifications" onClick={() => setToast(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Notifications</Link>
        <Link href={toast.href || (isMail ? "/dashboard/mail" : "/dashboard/notifications")} onClick={() => setToast(null)} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">{isMail ? "Open mail" : "View professor"}</Link>
      </div>
    </div>
  );
}
