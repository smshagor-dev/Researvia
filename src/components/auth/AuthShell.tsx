import type { ReactNode } from "react";
import { Brand } from "@/components/brand/Brand";

export function AuthShell({
  title,
  description,
  children,
  footer
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col">
        <Brand inverse />
        <div className="my-auto max-w-lg space-y-6">
          <div className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
            Free for students
          </div>
          <h2 className="text-4xl font-semibold tracking-tight">Find the right academic path with less noise.</h2>
          <p className="text-base leading-7 text-slate-300">
            Discover professors, scholarships and research opportunities, then keep every application and outreach step organized in one place.
          </p>
        </div>
        <p className="text-xs text-slate-500">Built on the Next.js App Router with a production-focused MongoDB architecture.</p>
      </aside>

      <main className="flex min-h-svh items-center justify-center bg-slate-50 px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Brand /></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
              <p className="text-sm leading-6 text-slate-500">{description}</p>
            </div>
            {children}
            {footer ? <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
