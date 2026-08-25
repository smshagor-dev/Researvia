import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = { title: "Reset password | ResearVia" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Choose a new password"
      description="Use a strong password that you do not use on another service."
      footer={<Link className="font-medium text-slate-950 hover:underline" href="/forgot-password">Request another reset link</Link>}
    >
      <ResetPasswordForm token={params.token || ""} />
    </AuthShell>
  );
}
