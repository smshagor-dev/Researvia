import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { Brand } from "@/components/brand/Brand";
import { requireAdmin } from "@/server/admin/admin.service";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return <div className="min-h-svh bg-slate-50"><div className="mx-auto grid min-h-svh max-w-[1600px] lg:grid-cols-[250px_1fr]"><aside className="hidden border-r border-slate-200 bg-white px-5 py-6 lg:block"><Brand/><p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Administration</p><div className="mt-7"><AdminNav/></div><div className="mt-8 border-t border-slate-200 pt-5"><p className="text-sm font-medium text-slate-900">{admin.displayName}</p><p className="mt-1 text-xs text-slate-500">{admin.role}</p><Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-slate-600 hover:text-slate-950">← Student dashboard</Link></div></aside><div className="min-w-0"><header className="border-b border-slate-200 bg-white px-5 py-4 lg:hidden"><div className="flex items-center justify-between gap-4"><Brand/><Link href="/dashboard" className="text-sm font-medium text-slate-600">Dashboard</Link></div><div className="mt-4 overflow-x-auto"><AdminNav/></div></header><main className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main></div></div></div>;
}
