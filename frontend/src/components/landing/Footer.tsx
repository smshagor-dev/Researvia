import Link from 'next/link';
import { Facebook, GraduationCap, Linkedin, Send, Twitter } from 'lucide-react';

const columns = [
  { title: 'Platform', links: [{ label: 'Features', href: '#features' }, { label: 'Professors', href: '/professors' }, { label: 'Scholarships', href: '/scholarships' }, { label: 'AI Email Writer', href: '#features' }, { label: 'Pricing', href: '#pricing' }] },
  { title: 'Resources', links: [{ label: 'Blog', href: '#resources' }, { label: 'Guides', href: '#resources' }, { label: 'Help Center', href: 'mailto:support@profcrm.com?subject=ProfCRM%20Help%20Center' }, { label: 'Webinars', href: '#resources' }, { label: 'Contact Us', href: 'mailto:support@profcrm.com' }] },
  { title: 'Company', links: [{ label: 'About Us', href: '#about' }, { label: 'Careers', href: 'mailto:careers@profcrm.com' }, { label: 'Privacy Policy', href: '#privacy' }, { label: 'Terms of Service', href: '#terms' }, { label: 'Cookie Policy', href: '#cookies' }] },
];

export function Footer() {
  return (
    <footer className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1.7fr_1.2fr]">
          <div>
            <Link href="/" className="flex items-center gap-2" aria-label="ProfCRM home">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
                <GraduationCap className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold tracking-tight">ProfCRM</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">AI-powered academic communication for professor discovery, scholarship planning, and professional email outreach.</p>
            <div className="mt-6 flex gap-3">
              {[{ label: 'Twitter', icon: Twitter }, { label: 'LinkedIn', icon: Linkedin }, { label: 'Facebook', icon: Facebook }].map(({ label, icon: Icon }) => (
                <a key={label} href={`mailto:social@profcrm.com?subject=${label}`} className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 transition hover:border-indigo-400 hover:text-white" aria-label={label}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-bold text-white">{column.title}</h3>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-sm text-slate-400 transition hover:text-white">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Newsletter</h3>
            <p className="mt-4 text-sm leading-6 text-slate-400">Get academic outreach guides, scholarship updates, and product news.</p>
            <form className="mt-5 flex gap-2" action="mailto:newsletter@profcrm.com" method="post">
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
              <input id="newsletter-email" name="email" type="email" required placeholder="you@example.com" className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20" />
              <button type="submit" className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500" aria-label="Subscribe">
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
        <div id="privacy" className="mt-12 border-t border-white/10 pt-6 text-sm text-slate-500">
          <div id="terms" />
          <div id="cookies" />
          <p>Copyright 2026 ProfCRM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
