import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in | ResearVia" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue your academic discovery and application workflow."
      footer={<>New to ResearVia? <Link className="font-medium text-slate-950 hover:underline" href="/register">Create a free account</Link></>}
    >
      <LoginForm />
    </AuthShell>
  );
}
