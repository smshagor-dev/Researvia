import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/session";

type SettingsCard = { title: string; description: string; href: string };
const items: SettingsCard[] = [
  { title: "Academic profile", description: "Profile data used for matching and applications", href: "/dashboard/profile" },
  { title: "Mailbox settings", description: "System email identity, SMTP/IMAP, forwarding and signature", href: "/dashboard/mail-settings" },
  { title: "Connected email accounts", description: "Gmail and Microsoft mailboxes", href: "/dashboard/email-accounts" },
  { title: "Notifications", description: "Professor matches, email and academic reminders", href: "/dashboard/notifications" },
  { title: "Security", description: "Password, two-factor authentication and sessions", href: "/dashboard/security" },
  { title: "Privacy Center", description: "Visibility, data and privacy controls", href: "/dashboard/privacy" },
  { title: "Documents", description: "CV, transcripts, certificates and application files", href: "/dashboard/documents" },
  { title: "Help & support", description: "Questions, bugs and feature requests", href: "/dashboard/support" }
];

export default async function Page() {
  if (!await getCurrentUser()) redirect("/login");
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-semibold text-slate-950">Settings</h1><p className="mt-1 text-sm text-slate-500">Manage your ResearVia account, communication, security, privacy and data from one place.</p></div>
    <div className="grid gap-3 md:grid-cols-2">{items.map((item) => <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow"><h2 className="font-semibold text-slate-900">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p><span className="mt-4 inline-block text-sm font-semibold text-slate-900">Open →</span></Link>)}</div>
  </div>;
}
