import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Create account | ResearVia" };

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your student account"
      description="Start organizing professors, scholarships, opportunities and applications for free."
      footer={<>Already have an account? <Link className="font-medium text-slate-950 hover:underline" href="/login">Sign in</Link></>}
    >
      <RegisterForm />
    </AuthShell>
  );
}
