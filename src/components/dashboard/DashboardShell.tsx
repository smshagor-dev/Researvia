import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand/Brand";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import type { SessionUser } from "@/server/auth/session";

export function DashboardShell({
  user,
  completion,
  onboardingComplete,
  children
}: {
  user: SessionUser;
  completion: number;
  onboardingComplete: boolean;
  children: ReactNode;
}) {
  const initial = user.displayName.trim().charAt(0).toUpperCase() || "S";

  return (
    <div className="min-h-svh bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-svh max-w-[1600px] lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white px-5 py-6 lg:flex lg:flex-col">
          <Brand />
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">Profile completion</span>
              <span className="text-xs font-semibold text-slate-950">{completion}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-slate-950 transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
          <DashboardNav className="mt-6" />
          <div className="mt-auto border-t border-slate-200 pt-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">{initial}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">{user.displayName}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <Brand />
              <div className="grid size-9 place-items-center rounded-full bg-slate-950 text-sm font-semibold text-white">{initial}</div>
            </div>
            <div className="overflow-x-auto px-4 pb-3 sm:px-6">
              <DashboardNav className="flex min-w-max gap-1 space-y-0" />
            </div>
          </header>

          {!onboardingComplete ? (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 sm:px-8">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-amber-900">Finish your academic profile to unlock personalized discovery later.</span>
                <Link href="/onboarding" className="font-semibold text-amber-950 underline underline-offset-4">Continue onboarding</Link>
              </div>
            </div>
          ) : null}

          <main className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
