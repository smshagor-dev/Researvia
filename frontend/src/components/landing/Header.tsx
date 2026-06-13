'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, GraduationCap, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AuthModal } from './auth-modal';

type AuthMode = 'login' | 'register';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Resources', href: '#resources' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
];

export function Header() {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
    setMenuOpen(false);
  };

  return (
    <>
      <header className={`sticky top-0 z-50 border-b border-white/70 bg-white/75 backdrop-blur-xl transition-all dark:border-white/10 dark:bg-[#050816]/75 ${scrolled ? 'shadow-lg shadow-slate-950/5 dark:shadow-black/20' : ''}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="ProfCRM home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/20">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">ProfCRM</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300 lg:flex" aria-label="Primary navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-slate-950 dark:hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <label className="relative">
              <span className="sr-only">Select language</span>
              <select className="h-9 appearance-none rounded-md border border-slate-200 bg-white/80 py-1.5 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <option>EN</option>
                <option>DE</option>
                <option>FR</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            </label>
            <ThemeToggle />
            <button type="button" onClick={() => openAuth('login')} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">
              Login
            </button>
            <button type="button" onClick={() => openAuth('register')} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 dark:bg-white dark:text-slate-950 dark:hover:bg-indigo-100">
              Get Started Free
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button type="button" onClick={() => setMenuOpen((value) => !value)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white/80 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white" aria-label="Toggle menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 bg-white/95 px-4 py-4 dark:border-white/10 dark:bg-[#050816]/95 md:hidden">
              <nav className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {navItems.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10">
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => openAuth('login')} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-800 dark:border-white/10 dark:text-white">
                  Login
                </button>
                <button type="button" onClick={() => openAuth('register')} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <AuthModal mode={authMode} open={authOpen} onClose={() => setAuthOpen(false)} onModeChange={setAuthMode} />
    </>
  );
}
