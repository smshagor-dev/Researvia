"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/profile", label: "Academic profile", icon: "profile" },
  { href: "/dashboard/research", label: "Research explorer", icon: "research" },
  { href: "/dashboard/reading", label: "Reading list", icon: "research" },
  { href: "/dashboard/universities", label: "Universities", icon: "university" },
  { href: "/dashboard/professors", label: "Professors", icon: "professor" },
  { href: "/dashboard/scholarships", label: "Scholarships", icon: "award" },
  { href: "/dashboard/opportunities", label: "Opportunities", icon: "briefcase" },
  { href: "/dashboard/saved", label: "Saved items", icon: "saved" },
  { href: "/dashboard/compare", label: "Compare", icon: "compare" },
  { href: "/dashboard/applications", label: "Applications", icon: "applications" },
  { href: "/dashboard/recommendations", label: "Recommendations", icon: "ai" },
  { href: "/dashboard/cv-intelligence", label: "CV Intelligence", icon: "documents" },
  { href: "/dashboard/outreach", label: "Outreach", icon: "outreach" },
  { href: "/dashboard/email-accounts", label: "Email accounts", icon: "email" },
  { href: "/dashboard/documents", label: "Documents", icon: "documents" },
  { href: "/dashboard/notifications", label: "Notifications", icon: "notifications" },
  { href: "/dashboard/security", label: "Security", icon: "security" }
] as const;

function NavIcon({ name }: { name: (typeof items)[number]["icon"] }) {
  if (name === "profile" || name === "professor") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3"/><path d="M5.5 19c.8-3.4 3.1-5 6.5-5s5.7 1.6 6.5 5"/>{name === "professor" ? <path d="m7 6 5-2 5 2-5 2-5-2Z"/> : null}</svg>;
  if (name === "research") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="5"/><path d="m14 14 5 5M7.5 10h5M10 7.5v5"/></svg>;
  if (name === "university") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 9 9-5 9 5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>;
  if (name === "award") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="9" r="5"/><path d="m9 13-1 7 4-2 4 2-1-7"/></svg>;
  if (name === "briefcase" || name === "applications") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>{name === "applications" ? <path d="m9 15 2 2 4-4"/> : null}</svg>;
  if (name === "saved") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4V4Z"/></svg>;
  if (name === "compare") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M8 5 4 9l4 4M4 9h9M16 19l4-4-4-4M20 15h-9"/></svg>;
  if (name === "email" || name === "outreach") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>{name === "outreach" ? <path d="m16 15 4 2-4 2v-4Z"/> : null}</svg>;
  if (name === "documents") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>;
  if (name === "notifications") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 16h12l-1.5-2v-4.5a4.5 4.5 0 0 0-9 0V14L6 16Z"/><path d="M10 19h4"/></svg>;
  if (name === "security") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3 5 6v5c0 4.4 2.8 7.8 7 10 4.2-2.2 7-5.6 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
  if (name === "ai") return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"/><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z"/></svg>;
  return <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m4 10 8-6 8 6"/><path d="M6.5 9.5V20h11V9.5"/><path d="M10 20v-6h4v6"/></svg>;
}

export function DashboardNav({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  return <nav className={`space-y-1 ${className}`} aria-label="Student workspace">{items.map((item) => { const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}><NavIcon name={item.icon}/>{item.label}</Link>; })}</nav>;
}
