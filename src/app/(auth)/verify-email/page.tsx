import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { VerifyEmailPanel } from "@/components/auth/VerifyEmailPanel";

export const metadata = { title: "Verify email | ResearVia" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string; email?: string }> }) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Verify your email"
      description={params.token ? "Confirm your email address to activate your ResearVia account." : "Check your inbox for the verification link we sent when you registered."}
      footer={<Link className="font-medium text-slate-950 hover:underline" href="/login">Back to sign in</Link>}
    >
      <VerifyEmailPanel token={params.token || ""} initialEmail={params.email || ""} />
    </AuthShell>
  );
}
