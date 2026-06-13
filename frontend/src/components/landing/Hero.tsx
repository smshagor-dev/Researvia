'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { DashboardPreview } from './DashboardPreview';

const trustPoints = ['20 Free Credits/Month', 'No Credit Card Required', 'Cancel Anytime'];

export function Hero() {
  return (
    <section id="about" className="relative border-b border-slate-200 dark:border-white/10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(37,99,235,0.16),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] dark:bg-[radial-gradient(circle_at_18%_20%,rgba(124,58,237,0.24),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(37,99,235,0.2),transparent_30%),linear-gradient(180deg,#050816_0%,#080b1d_100%)]" />
      <motion.div className="absolute left-8 top-28 h-24 w-24 rounded-full bg-indigo-300/20 blur-2xl dark:bg-indigo-500/20" animate={{ y: [0, 18, 0] }} transition={{ duration: 8, repeat: Infinity }} />
      <motion.div className="absolute bottom-16 right-8 h-32 w-32 rounded-full bg-blue-300/20 blur-2xl dark:bg-blue-500/20" animate={{ y: [0, -20, 0] }} transition={{ duration: 9, repeat: Infinity }} />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-20">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm shadow-indigo-900/5 dark:border-indigo-400/20 dark:bg-white/5 dark:text-indigo-200">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            AI-Powered Academic Communication Platform
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
            Find Professors.
            <br />
            Write Better Emails.
            <br />
            Get <span className="animate-gradient-text bg-[linear-gradient(90deg,#4f46e5,#9333ea,#2563eb,#4f46e5)] bg-[length:220%_auto] bg-clip-text text-transparent">Your Dream Opportunity.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            ProfCRM helps ambitious students discover professors and scholarships, generate personalized AI emails, and track every academic conversation from first message to final response.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-indigo-600/25">
              Get Started Free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="#features" className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:text-white">
              Explore Features
            </a>
          </div>
          <div className="mt-7 flex flex-col gap-3 text-sm font-medium text-slate-600 dark:text-slate-300 sm:flex-row sm:flex-wrap">
            {trustPoints.map((point) => (
              <span key={point} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {point}
              </span>
            ))}
          </div>
        </motion.div>

        <DashboardPreview />
      </div>
    </section>
  );
}
