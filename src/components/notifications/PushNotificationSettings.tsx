"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { NotificationPreferencesDto } from "@/server/notifications/notification-preferences.service";

type PushState = "checking" | "enabled" | "disabled" | "denied" | "unsupported";

function vapidKeyToArrayBuffer(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

function browserSupportsPush() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function PushNotificationSettings({
  configured,
  vapidPublicKey,
  initialSubscriptionCount,
  initialPreferences
}: {
  configured: boolean;
  vapidPublicKey: string;
  initialSubscriptionCount: number;
  initialPreferences: NotificationPreferencesDto;
}) {
  const [pushState, setPushState] = useState<PushState>("checking");
  const [subscriptionCount, setSubscriptionCount] = useState(initialSubscriptionCount);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function inspect() {
      if (!browserSupportsPush()) {
        if (active) setPushState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (active) setPushState("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (active) setPushState(subscription ? "enabled" : "disabled");
      } catch {
        if (active) setPushState("disabled");
      }
    }
    void inspect();
    return () => { active = false; };
  }, []);

  async function enablePush() {
    setSaving(true); setMessage(null); setError(null);
    try {
      if (!configured || !vapidPublicKey) throw new Error("Push delivery is not configured on this server yet.");
      if (!browserSupportsPush()) throw new Error("This browser does not support web push notifications.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "disabled");
        throw new Error(permission === "denied" ? "Notification permission is blocked in your browser settings." : "Notification permission was not granted.");
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyToArrayBuffer(vapidPublicKey)
        });
      }
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Browser returned an incomplete push subscription.");

      const response = await fetch("/api/v1/me/push-subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, expirationTime: json.expirationTime ?? null, keys: json.keys })
      });
      const body = await response.json() as { data?: { subscriptionCount?: number }; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || "Unable to enable push notifications.");
      setSubscriptionCount(Number(body.data?.subscriptionCount ?? subscriptionCount + 1));
      setPushState("enabled");
      setMessage("Push notifications are enabled on this device.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to enable push notifications.");
    } finally { setSaving(false); }
  }

  async function disablePush() {
    setSaving(true); setMessage(null); setError(null);
    try {
      if (!browserSupportsPush()) return setPushState("unsupported");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/v1/me/push-subscriptions", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        const body = await response.json() as { data?: { subscriptionCount?: number }; error?: { message?: string } };
        if (!response.ok) throw new Error(body.error?.message || "Unable to disable push notifications.");
        await subscription.unsubscribe();
        setSubscriptionCount(Number(body.data?.subscriptionCount ?? Math.max(0, subscriptionCount - 1)));
      }
      setPushState("disabled");
      setMessage("Push notifications are disabled on this device.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to disable push notifications.");
    } finally { setSaving(false); }
  }

  async function savePreferences() {
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/v1/me/notification-preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preferences)
      });
      const body = await response.json() as { data?: { preferences?: NotificationPreferencesDto }; error?: { message?: string } };
      if (!response.ok || !body.data?.preferences) throw new Error(body.error?.message || "Unable to save notification preferences.");
      setPreferences(body.data.preferences);
      setMessage("Professor match notification preferences saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save notification preferences.");
    } finally { setSaving(false); }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Professor matching</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Automatic match alerts</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">ResearVia reevaluates your academic profile after relevant profile changes and when professors are published. Strong matches are saved to your inbox and can be pushed to this browser or installed PWA.</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{subscriptionCount} active push device{subscriptionCount === 1 ? "" : "s"}</div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 size-4" checked={preferences.professorMatchWeb} onChange={(event) => setPreferences({ ...preferences, professorMatchWeb: event.target.checked })} />
          <span><strong className="block font-medium text-slate-950">Web / in-app alerts</strong><span className="mt-1 block text-slate-500">Show professor matches in the notification inbox and dashboard toast.</span></span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm text-slate-700">
          <input type="checkbox" className="mt-0.5 size-4" checked={preferences.professorMatchPush} onChange={(event) => setPreferences({ ...preferences, professorMatchPush: event.target.checked })} />
          <span><strong className="block font-medium text-slate-950">Push / local alerts</strong><span className="mt-1 block text-slate-500">Deliver system notifications through subscribed browsers and installed PWAs.</span></span>
        </label>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-sm font-medium text-slate-950">Minimum professor match score</p><p className="mt-1 text-xs text-slate-500">Lower values send broader matches; higher values are stricter.</p></div>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-sm font-semibold text-white">{preferences.minimumProfessorMatchScore}%</span>
        </div>
        <input type="range" min={35} max={95} step={5} value={preferences.minimumProfessorMatchScore} onChange={(event) => setPreferences({ ...preferences, minimumProfessorMatchScore: Number(event.target.value) })} className="mt-4 w-full" aria-label="Minimum professor match score" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void savePreferences()} disabled={saving}>{saving ? "Saving…" : "Save alert settings"}</Button>
        {pushState === "enabled" ? <Button type="button" variant="secondary" onClick={() => void disablePush()} disabled={saving}>Disable push on this device</Button> : <Button type="button" variant="secondary" onClick={() => void enablePush()} disabled={saving || !configured || pushState === "unsupported" || pushState === "denied"}>Enable push on this device</Button>}
        <span className="text-xs text-slate-500">Device status: {pushState === "checking" ? "checking…" : pushState}</span>
      </div>

      {!configured ? <div className="mt-4"><Alert tone="error">Server push delivery is not configured. Add the VAPID environment variables before enabling device push.</Alert></div> : null}
      {pushState === "denied" ? <div className="mt-4"><Alert tone="error">Browser notification permission is blocked. Re-enable notifications for this site in browser settings, then return here.</Alert></div> : null}
      {pushState === "unsupported" ? <div className="mt-4"><Alert tone="error">This browser does not support service-worker push notifications.</Alert></div> : null}
      {message ? <div className="mt-4"><Alert tone="success">{message}</Alert></div> : null}
      {error ? <div className="mt-4"><Alert tone="error">{error}</Alert></div> : null}
    </section>
  );
}
