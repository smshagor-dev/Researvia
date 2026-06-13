'use client';

import { useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const stats = [
  { value: 100, suffix: 'M+', label: 'Professors in Database' },
  { value: 50, suffix: 'K+', label: 'Universities Covered' },
  { value: 500, suffix: 'K+', label: 'Emails Sent' },
  { value: 95, suffix: '%', label: 'Email Delivery Rate' },
];

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const total = 60;
    const timer = window.setInterval(() => {
      frame += 1;
      setCount(Math.round((value * frame) / total));
      if (frame >= total) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [inView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export function Stats() {
  return (
    <section className="bg-white px-4 py-24 dark:bg-[#050816] sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-purple-700 to-blue-700 p-8 text-white shadow-2xl shadow-indigo-900/20 sm:p-10 lg:p-12">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-indigo-100">Global academic network</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Built for serious academic outreach at scale.</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <p className="text-3xl font-bold"><Counter value={stat.value} suffix={stat.suffix} /></p>
                <p className="mt-2 text-sm font-medium text-indigo-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
