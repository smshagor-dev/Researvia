import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getCurrentUser } from "@/server/auth/session";
import { getStudentProfile } from "@/server/profile/profile.service";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STUDENT") redirect("/");

  const profile = await getStudentProfile(user.id);

  return (
    <DashboardShell
      user={user}
      completion={profile.completion}
      onboardingComplete={Boolean(profile.onboardingCompletedAt)}
    >
      {children}
    </DashboardShell>
  );
}
