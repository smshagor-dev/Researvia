'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/authStore';
import { useMe } from '@/lib/hooks';
import { getToken } from '@/lib/api/client';
import { GraduationCap, LayoutDashboard, Users, UserCheck, BookOpen, Building, Tag, Upload, BarChart3, FileText, LogOut, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout } from '@/lib/hooks';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const navItems = [
  { href:'/admin/dashboard', label:'Dashboard', icon:LayoutDashboard },
  { href:'/admin/users', label:'Users', icon:Users },
  { href:'/admin/professors', label:'Professors', icon:UserCheck },
  { href:'/admin/verification', label:'Verification Queue', icon:FileText },
  { href:'/admin/scholarships', label:'Scholarships', icon:BookOpen },
  { href:'/admin/universities', label:'Universities', icon:Building },
  { href:'/admin/plans', label:'Plans', icon:Tag },
  { href:'/admin/imports', label:'Imports', icon:Upload },
  { href:'/admin/analytics', label:'Analytics', icon:BarChart3 },
  { href:'/admin/mailboxes', label:'Mailboxes', icon:Mail },
  { href:'/admin/audit-logs', label:'Audit Logs', icon:FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const logout = useLogout();
  useMe();

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    if (user && user.role === 'user') router.replace('/dashboard');
  }, [user, router]);

  return (
    <div className="system-theme-scope flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <aside className="w-56 flex-shrink-0 bg-gray-900 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">ProfCRM</p>
              <p className="text-red-400 text-xs font-semibold">Admin Panel</p>
            </div>
          </Link>
          <div className="mt-4">
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition',
                active ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-2 pb-4 border-t border-gray-800 pt-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition">
            ← User Panel
          </Link>
          <button onClick={() => logout.mutate()} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-background">{children}</main>
    </div>
  );
}
