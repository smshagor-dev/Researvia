import Link from "next/link";
import { NotificationActions } from "@/components/notifications/NotificationActions";
import { PushNotificationSettings } from "@/components/notifications/PushNotificationSettings";
import { getCurrentUser } from "@/server/auth/session";
import { getNotificationPreferences } from "@/server/notifications/notification-preferences.service";
import { listNotifications } from "@/server/notifications/notification.service";
import { countUserPushSubscriptions, getWebPushPublicConfig } from "@/server/notifications/push.service";

export const runtime = "nodejs";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [{ items, unread }, preferences, pushConfig, subscriptionCount] = await Promise.all([
    listNotifications(user.id, 100),
    getNotificationPreferences(user.id),
    Promise.resolve(getWebPushPublicConfig()),
    countUserPushSubscriptions(user.id)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-medium text-slate-500">Updates</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Notifications</h1><p className="mt-2 text-sm text-slate-600">{unread} unread notification{unread === 1 ? "" : "s"}.</p></div>
        {unread ? <NotificationActions all /> : null}
      </div>

      <PushNotificationSettings configured={pushConfig.enabled} vapidPublicKey={pushConfig.publicKey} initialSubscriptionCount={subscriptionCount} initialPreferences={preferences} />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {items.length ? items.map((item) => {
            const metadata = (item.metadata && typeof item.metadata === "object" ? item.metadata : {}) as Record<string, unknown>;
            const score = typeof metadata.matchScore === "number" ? metadata.matchScore : null;
            const reasons = Array.isArray(metadata.matchReasons) ? metadata.matchReasons.map(String).slice(0, 4) : [];
            return (
              <div key={item._id.toString()} className={`px-5 py-5 ${item.readAt ? "" : "bg-slate-50/70"}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-950">{item.title}</h2>
                      {score !== null ? <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">{score}% match</span> : null}
                      {!item.readAt ? <span className="size-2 rounded-full bg-slate-950" aria-label="Unread"/> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
                    {reasons.length ? <div className="mt-3 flex flex-wrap gap-2">{reasons.map((reason) => <span key={reason} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{reason}</span>)}</div> : null}
                    <p className="mt-3 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">{item.href ? <Link href={item.href} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Open</Link> : null}{!item.readAt ? <NotificationActions id={item._id.toString()} /> : null}</div>
                </div>
              </div>
            );
          }) : <div className="px-5 py-10 text-sm text-slate-500">No notifications yet. Complete your academic profile and ResearVia will alert you when strong professor matches appear.</div>}
        </div>
      </section>
    </div>
  );
}
