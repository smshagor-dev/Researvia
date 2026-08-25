import Link from "next/link";
import { Brand } from "@/components/brand/Brand";

export default function HomePage() {
  return (
    <main className="min-h-svh bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Brand />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Sign in</Link>
            <Link href="/register" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Create free account</Link>
          </nav>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-28">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">100% free for students</div>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">A clearer route to your next academic opportunity.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">ResearVia brings professor discovery, scholarships, research opportunities, outreach and application tracking into one student workspace.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800">Get started free</Link>
            <Link href="/login" className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50">Sign in</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Student workspace</p>
            <div className="mt-6 space-y-3">
              {["Recommended professors", "Funding opportunities", "Upcoming deadlines", "Outreach follow-ups"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-lg border border-slate-100 p-4">
                  <span className="text-sm font-medium text-slate-800">{item}</span><span className="size-2 rounded-full bg-slate-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
