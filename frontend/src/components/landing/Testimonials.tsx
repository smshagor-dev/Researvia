'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Reveal } from './motion';

const testimonials = [
  { name: 'Maya Chen', role: 'MS Computer Science Applicant', university: 'University of Toronto', quote: 'ResearVia helped me move from random cold emails to a focused professor shortlist with messages that sounded much closer to my research interests.', initials: 'MC' },
  { name: 'Ahmed Rahman', role: 'PhD Research Candidate', university: 'TUM', quote: 'The email tracking and scholarship deadline view gave me one calm place to manage applications across multiple countries.', initials: 'AR' },
  { name: 'Sofia Martinez', role: 'Scholarship Applicant', university: 'University of Cambridge', quote: 'The AI drafts were specific, concise, and easy to edit. I saved hours while keeping every outreach message professional.', initials: 'SM' },
];

export function Testimonials() {
  return (
    <section id="resources" className="border-y border-slate-200 bg-slate-50 px-4 py-24 dark:border-white/10 dark:bg-[#080b1d] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Testimonials</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Loved by Students & Researchers Worldwide</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <motion.article key={testimonial.name} whileHover={{ y: -6 }} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mb-4 flex gap-1 text-amber-400">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />)}</div>
              <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">&quot;{testimonial.quote}&quot;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-sm font-bold text-white">{testimonial.initials}</div>
                <div>
                  <p className="font-bold text-slate-950 dark:text-white">{testimonial.name}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{testimonial.role}</p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">{testimonial.university}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-2">{testimonials.map((item, index) => <span key={item.name} className={`h-2 rounded-full ${index === 0 ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300 dark:bg-white/20'}`} />)}</div>
      </div>
    </section>
  );
}
