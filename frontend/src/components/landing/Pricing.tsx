'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Reveal } from './motion';

const plans = [
  { name: 'Free', price: '$0', description: 'For students starting their search.', features: ['20 Credits/month', '5 Email Reveals', 'AI Email Generation', 'Basic Search Filters', 'Email Tracking'] },
  { name: 'Starter', price: '$9.99', description: 'For active professor outreach.', popular: true, features: ['100 Credits/month', '20 Email Reveals', 'AI Email Generation', 'Advanced Search Filters', 'Email Tracking', 'Priority Support'] },
  { name: 'Pro', price: '$29.99', description: 'For high-volume applications.', features: ['500 Credits/month', '100 Email Reveals', 'AI Email Generation', 'Bulk Email Sending', 'Email Tracking', 'Priority Support'] },
  { name: 'Enterprise', price: '$99.99', description: 'For teams and advisors.', features: ['2000 Credits/month', 'Unlimited Email Reveals', 'All Pro Features', 'Team Management', 'Dedicated Support', 'Custom Integrations'] },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="bg-white px-4 py-24 dark:bg-[#050816] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Choose the Perfect Plan for You</h2>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">Start free and upgrade when your outreach volume grows.</p>
          <div className="mt-7 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
            <button type="button" onClick={() => setAnnual(false)} className={`rounded-full px-4 py-2 text-sm font-bold ${!annual ? 'bg-white text-indigo-700 shadow-sm dark:bg-white dark:text-slate-950' : 'text-slate-500 dark:text-slate-300'}`}>Monthly</button>
            <button type="button" onClick={() => setAnnual(true)} className={`rounded-full px-4 py-2 text-sm font-bold ${annual ? 'bg-white text-indigo-700 shadow-sm dark:bg-white dark:text-slate-950' : 'text-slate-500 dark:text-slate-300'}`}>Yearly</button>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <motion.article key={plan.name} whileHover={{ y: -8, scale: 1.015 }} className={`relative flex min-h-[520px] flex-col rounded-2xl border p-6 shadow-sm transition ${plan.popular ? 'border-indigo-500 bg-indigo-50/70 shadow-indigo-950/10 dark:border-indigo-400 dark:bg-indigo-500/10' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]'}`}>
              {plan.popular && <span className="absolute right-5 top-5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">Most Popular</span>}
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">{plan.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.description}</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-bold text-slate-950 dark:text-white">{plan.price}</span>
                <span className="pb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">/month</span>
              </div>
              {annual && <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">Yearly billing selected</p>}
              <Link href="/register" className={`mt-6 inline-flex w-full justify-center rounded-md px-4 py-3 text-sm font-bold transition ${plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-slate-200 bg-white text-slate-900 hover:border-indigo-200 hover:bg-indigo-50 dark:border-white/10 dark:bg-white/5 dark:text-white'}`}>
                Get Started
              </Link>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
