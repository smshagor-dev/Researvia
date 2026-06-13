'use client';

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Bot, MailCheck, Search, ShieldCheck } from 'lucide-react';
import { fadeUp, Reveal, stagger } from './motion';

const features = [
  { icon: Search, title: 'Discover Professors', description: 'Search by research area, university, country, publications, and fit signals.', label: 'Discovery' },
  { icon: Bot, title: 'AI Email Writer', description: 'Generate concise, personalized academic emails grounded in professor context.', label: 'AI writing' },
  { icon: MailCheck, title: 'Email CRM', description: 'Track sent emails, opens, replies, follow-ups, and full thread history.', label: 'Tracking' },
  { icon: BookOpen, title: 'Scholarship Finder', description: 'Discover funding opportunities, save deadlines, and manage applications.', label: 'Funding' },
  { icon: ShieldCheck, title: 'Secure & Verified', description: 'Protect credentials and keep academic communication data reliable.', label: 'Security' },
];

export function Features() {
  return (
    <section id="features" className="bg-white px-4 py-24 dark:bg-[#050816] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Features</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Everything You Need for Academic Success</h2>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            A professional academic communication system for discovery, writing, tracking, and follow-through.
          </p>
        </Reveal>

        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {features.map(({ icon: Icon, title, description, label }) => (
            <motion.article
              key={title}
              variants={fadeUp}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.25 }}
              className="group relative flex min-h-[290px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-950/5 transition hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-950/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-400/40"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-slate-300">{label}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
              </div>
              <a href="#solutions" className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:gap-2 hover:text-indigo-700 dark:text-indigo-300">
                Learn more <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
