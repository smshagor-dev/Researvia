import Link from 'next/link';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { DashboardPreview } from './dashboard-preview';

const trustPoints = ['20 Free Credits/Month', 'No Credit Card Required', 'Cancel Anytime'];

export function HeroSection() {
  return (
    <section id="about" className="relative border-b border-slate-200">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(124,58,237,0.16),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(37,99,235,0.15),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm shadow-indigo-900/5">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            AI-Powered Academic Communication Platform
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Find Professors.
            <br />
            Write Better Emails.
            <br />
            Get <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">Your Dream Opportunity.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            ResearVia helps students discover professors, scholarships, and research opportunities, then manage AI-assisted outreach from first draft to follow-up.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-600/25">
              Get Started Free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="#features" className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
              Explore Features
            </a>
          </div>
          <div className="mt-7 flex flex-col gap-3 text-sm font-medium text-slate-600 sm:flex-row sm:flex-wrap">
            {trustPoints.map((point) => (
              <span key={point} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                {point}
              </span>
            ))}
          </div>
        </div>
        <DashboardPreview />
      </div>
    </section>
  );
}
