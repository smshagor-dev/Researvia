'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMe, useLogout } from '@/lib/hooks';
import { getToken } from '@/lib/api/client';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  BriefcaseBusiness,
  Building,
  Tag,
  Upload,
  BarChart3,
  FileText,
  LogOut,
  Mail,
  Activity,
  Sparkles,
  CreditCard,
  SlidersHorizontal,
  TicketPercent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/professors', label: 'Professors', icon: UserCheck },
  { href: '/verification', label: 'Verification Queue', icon: FileText },
  { href: '/scholarships', label: 'Scholarships', icon: BookOpen },
  { href: '/opportunities', label: 'Opportunities', icon: BriefcaseBusiness },
  { href: '/universities', label: 'Universities', icon: Building },
  { href: '/plans', label: 'Plans', icon: Tag },
  { href: '/imports', label: 'Imports', icon: Upload },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/mailboxes', label: 'Mailboxes', icon: Mail },
  { href: '/settings', label: 'System Settings', icon: SlidersHorizontal },
  { href: '/system', label: 'System Health', icon: Activity },
  { href: '/matches', label: 'AI Matches', icon: Sparkles },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/billing#promos', label: 'Promos', icon: TicketPercent },
  { href: '/audit-logs', label: 'Audit Logs', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const logout = useLogout();

  useMe();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (user && user.role === 'user') {
      router.replace('/dashboard/student');
    }
  }, [user, router]);

  return (
    <div className="system-theme-scope flex h-screen overflow-hidden bg-[#020817] text-slate-100">
      <aside className="w-64 flex-shrink-0 border-r border-white/10 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)]">
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-5 py-5">
            <Link href="/dashboard/admin/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#ef4444,#f97316)] shadow-lg shadow-red-500/20">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">ResearVia</p>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300/90">Admin Panel</p>
              </div>
            </Link>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
            {navItems.map(({ href, label, icon: Icon }) => {
              const fullHref = `/dashboard/admin${href}`;
              const active = pathname === fullHref || (href !== '/dashboard' && pathname.startsWith(fullHref));

              return (
                <Link
                  key={href}
                  href={fullHref}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    active
                      ? 'bg-[linear-gradient(135deg,#ef4444,#dc2626)] text-white shadow-lg shadow-red-950/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 px-2 pb-4 pt-3">
            <Link
              href="/dashboard/student"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              Back to User Panel
            </Link>
            <button
              onClick={() => logout.mutate()}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.10),transparent_18%),linear-gradient(180deg,#020817_0%,#081120_100%)]">
        {children}
      </main>
    </div>
  );
}
