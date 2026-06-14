'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMe, useUnreadCount, useCredits } from '@/lib/hooks';
import { getToken } from '@/lib/api/client';
import {
  GraduationCap, LayoutDashboard, Users, BookOpen, Mail,
  Bookmark, Star, Settings, Bell, LogOut, ChevronRight,
  Coins, Menu, X, Search, AtSign, FileText, BriefcaseBusiness, KanbanSquare,
} from 'lucide-react';
import { cn, formatCredits } from '@/lib/utils';
import { useLogout } from '@/lib/hooks';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const navItems = [
  { href: '/dashboard/student', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/professors', label: 'Professors', icon: Users },
  { href: '/scholarships', label: 'Scholarships', icon: BookOpen },
  { href: '/opportunities', label: 'Opportunities', icon: BriefcaseBusiness },
  { href: '/applications', label: 'Applications', icon: KanbanSquare },
  { href: '/inbox', label: 'Inbox', icon: Mail },
  { href: '/saved/professors', label: 'Saved Professors', icon: Star },
  { href: '/saved/scholarships', label: 'Saved Scholarships', icon: Bookmark },
];

const settingsItems = [
  { href: '/settings/profile', label: 'Profile', icon: Settings },
  { href: '/settings/academic-profile', label: 'Academic Profile', icon: GraduationCap },
  { href: '/settings/documents', label: 'Documents', icon: FileText },
  { href: '/settings/email-accounts', label: 'Email Accounts', icon: AtSign },
  { href: '/settings/security', label: 'Security', icon: Bell },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logout = useLogout();

  const { data: meData } = useMe();
  const { data: unreadData } = useUnreadCount();
  const { data: creditsData } = useCredits();

  useEffect(() => {
    const token = getToken();
    if (!token) router.replace('/login');
  }, [router]);

  const unreadCount = (unreadData as any)?.count || 0;
  const creditBalance = (creditsData as any)?.balance ?? user?.credits?.balance ?? 0;
  const currentUser = (meData as any) || user;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="border-b border-gray-100 px-6 py-5 dark:border-slate-800">
        <Link href="/dashboard/student" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg gradient-text">ProfCRM</span>
        </Link>
      </div>

      {/* Credits badge */}
      <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-500/10">
        <Coins className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{formatCredits(creditBalance)} credits</span>
        <Link href="/settings/subscription" className="ml-auto text-xs text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200">Upgrade</Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {label === 'Inbox' && unreadCount > 0 && (
                <span className={cn(
                  'ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center',
                  active ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
                )}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-100 px-3 pb-4 pt-3 space-y-0.5 dark:border-slate-800">
        {settingsItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              pathname.startsWith('/settings') ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100')}>
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
        <button
          onClick={() => logout.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full gradient-primary text-white text-xs font-bold flex-shrink-0">
            {currentUser?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={toImageSrc(currentUser.avatarUrl)} alt={currentUser.fullName || 'User avatar'} className="h-full w-full object-cover" />
            ) : (
              currentUser?.fullName?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate dark:text-slate-100">{currentUser?.fullName}</p>
            <p className="text-xs text-gray-400 truncate dark:text-slate-500">{currentUser?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="system-theme-scope flex h-screen overflow-hidden bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-gray-100 bg-white flex-shrink-0 dark:border-slate-800 dark:bg-slate-950">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 bg-white flex flex-col shadow-xl dark:bg-slate-950">
            <button className="absolute top-4 right-4" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="border-b border-gray-100 bg-white px-4 py-3 flex items-center gap-4 flex-shrink-0 lg:px-6 dark:border-slate-800 dark:bg-slate-950">
          <button className="lg:hidden rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600 dark:text-slate-300" />
          </button>

          <div className="flex-1 max-w-md">
            <Link href="/professors?q=" className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
              <Search className="w-4 h-4" />
              Search professors, scholarships...
            </Link>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <Link href="/users/me/notifications" className="relative rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-slate-800">
              <Bell className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}

function toImageSrc(value: string) {
  if (!value) return value;
  if (value.startsWith('blob:') || value.startsWith('data:')) return value;
  const [rawBase, rawQuery] = value.split('?');
  const normalizedBase = rawBase
    .split('/')
    .map((part, index) => (index < 3 ? part : encodeURIComponent(decodeURIComponent(part))))
    .join('/');
  const cacheBuster = `cb=${Date.now()}`;
  return rawQuery ? `${normalizedBase}?${rawQuery}&${cacheBuster}` : `${normalizedBase}?${cacheBuster}`;
}
