import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Forgot password | ResearVia" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we will send a single-use password reset link if the account is eligible."
      footer={<Link className="font-medium text-slate-950 hover:underline" href="/login">Back to sign in</Link>}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
