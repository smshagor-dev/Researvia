import { PrivacyCenter } from "@/components/privacy/PrivacyCenter";

export default function PrivacyPage() {
  return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Account controls</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Privacy Center</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Manage optional processing, active sessions, account export, and deletion from one place.</p></div><PrivacyCenter /></div>;
}
