import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="system-theme-scope min-h-screen">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
