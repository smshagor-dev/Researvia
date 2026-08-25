"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/profile", label: "Academic profile", icon: "profile" },
  { href: "/dashboard/universities", label: "Universities", icon: "university" },
  { href: "/dashboard/professors", label: "Professors", icon: "professor" },
  { href: "/dashboard/scholarships", label: "Scholarships", icon: "award" },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: "briefcase" },
  { href: "/dashboard/saved", label: "Saved items", icon: "saved" },
  { href: "/dashboard/compare", label: "Compare", icon: "compare" },
  { href: "/dashboard/applications", label: "Applications", icon: "applications" }
] as const;

function NavIcon({ name }: { name: (typeof items)[number]["icon"] }) {
  if (name === "profile" || name === "professor") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5.5 19c.8-3.4 3.1-5 6.5-5s5.7 1.6 6.5 5"/>{name === "professor" ? <path d="m7 6 5-2 5 2-5 2-5-2Z"/> : null}</svg>;
  if (name === "university") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 9 9-5 9 5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>;
  if (name === "award") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="9" r="5"/><path d="m9 13-1 7 4-2 4 2-1-7"/></svg>;
  if (name === "briefcase" || name === "applications") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>{name === "applications" ? <path d="m9 15 2 2 4-4"/> : null}</svg>;
  if (name === "saved") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4V4Z"/></svg>;
  if (name === "compare") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 5 4 9l4 4M4 9h9M16 19l4-4-4-4M20 15h-9"/></svg>;
  return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 10 8-6 8 6"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-6h4v6"/></svg>;
}

export function DashboardNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  return <nav className={`space-y-1 ${className}`} aria-label="Student workspace">{items.map((item) => { const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}><NavIcon name={item.icon}/>{item.label}</Link>; })}</nav>;
}
