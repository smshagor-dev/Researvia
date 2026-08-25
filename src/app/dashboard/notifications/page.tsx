import Link from "next/link";
import { NotificationActions } from "@/components/notifications/NotificationActions";
import { getCurrentUser } from "@/server/auth/session";
import { listNotifications } from "@/server/notifications/notification.service";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { items, unread } = await listNotifications(user.id, 100);
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Updates</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Notifications</h1><p className="mt-2 text-sm text-slate-600">{unread} unread notification{unread === 1 ? "" : "s"}.</p></div>{unread ? <NotificationActions all /> : null}</div><section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{items.length ? items.map((item) => <div key={item._id.toString()} className={`px-5 py-5 ${item.readAt ? "" : "bg-slate-50/70"}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><div className="flex items-center gap-2"><h2 className="font-semibold text-slate-950">{item.title}</h2>{!item.readAt ? <span className="size-2 rounded-full bg-slate-950" aria-label="Unread"/> : null}</div><p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p></div><div className="flex gap-2">{item.href ? <Link href={item.href} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Open</Link> : null}{!item.readAt ? <NotificationActions id={item._id.toString()} /> : null}</div></div></div>) : <div className="px-5 py-10 text-sm text-slate-500">No notifications yet.</div>}</div></section></div>;
}
