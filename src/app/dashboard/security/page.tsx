import { TwoFactorPanel } from "@/components/security/TwoFactorPanel";

export default function SecurityPage() {
  return <div className="space-y-6"><div><p className="text-sm font-medium text-slate-500">Account security</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Security</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Manage strong sign-in protection for your ResearVia account.</p></div><TwoFactorPanel /></div>;
}
