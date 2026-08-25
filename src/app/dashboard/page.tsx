import { redirect } from "next/navigation";
import { Brand } from "@/components/brand/Brand";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Dashboard | ResearVia" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-svh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Brand />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{user.displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">Student workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Welcome, {user.displayName.split(" ")[0]}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your account authentication is active. Academic discovery and application modules will be added to this professional dashboard shell next.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {["Professor discovery", "Scholarships", "Applications"].map((label) => (
            <section key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <p className="mt-2 text-sm text-slate-500">Module foundation ready for the next implementation wave.</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
