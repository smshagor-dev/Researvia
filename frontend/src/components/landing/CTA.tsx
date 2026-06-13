'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CTA() {
  return (
    <section className="bg-white px-4 py-24 dark:bg-[#050816] sm:px-6 lg:px-8">
      <motion.div whileHover={{ scale: 1.01 }} className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-blue-700 p-8 text-center text-white shadow-2xl shadow-indigo-900/20 sm:p-12">
        <p className="text-sm font-bold uppercase tracking-wide text-indigo-100">Start today</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Ready to Take the Next Step?</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-indigo-100">Build a professional academic outreach workflow with professor discovery, AI writing, scholarship tracking, and email analytics in one place.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-indigo-50">Get Started Free <ArrowRight className="h-4 w-4" /></Link>
          <a href="mailto:sales@profcrm.com?subject=ProfCRM%20Demo%20Request" className="inline-flex items-center justify-center rounded-md border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15">Book a Demo</a>
        </div>
      </motion.div>
    </section>
  );
}
