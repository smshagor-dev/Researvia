"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const endpoint = challengeToken ? "/api/v1/auth/2fa/verify-login" : "/api/v1/auth/login";
      const body = challengeToken
        ? { challengeToken, code: form.get("code") }
        : { email: form.get("email"), password: form.get("password"), rememberMe: form.get("rememberMe") === "on" };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const apiError = await readClientApiError(response);
        setError(apiError.message);
        setNeedsVerification(apiError.code === "EMAIL_NOT_VERIFIED");
        return;
      }

      const payload = (await response.json()) as { data?: { requiresTwoFactor?: boolean; challengeToken?: string } };
      if (!challengeToken && payload.data?.requiresTwoFactor && payload.data.challengeToken) {
        setChallengeToken(payload.data.challengeToken);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach ResearVia. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (challengeToken) {
    return (
      <form className="space-y-5" onSubmit={submit}>
        {error ? <Alert>{error}</Alert> : null}
        <Alert tone="info">Enter the 6-digit code from your authenticator app, or one unused recovery code.</Alert>
        <div className="space-y-2">
          <Label htmlFor="code">Authenticator or recovery code</Label>
          <Input id="code" name="code" autoComplete="one-time-code" required maxLength={32} autoFocus placeholder="123456" />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Verifying…" : "Verify and sign in"}</Button>
        <button type="button" className="w-full text-sm font-medium text-slate-600 hover:text-slate-950" onClick={() => { setChallengeToken(null); setError(null); }}>Use a different account</button>
      </form>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {error ? <Alert>{error}</Alert> : null}
      {needsVerification ? <Alert tone="info"><Link className="font-medium underline underline-offset-4" href={`/verify-email?email=${encodeURIComponent(email)}`}>Resend your verification email</Link></Alert> : null}
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.edu" /></div>
      <div className="space-y-2"><div className="flex items-center justify-between gap-4"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-xs font-medium text-slate-600 hover:text-slate-950">Forgot password?</Link></div><Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} /></div>
      <label className="flex items-center gap-2 text-sm text-slate-600"><input name="rememberMe" type="checkbox" className="size-4 rounded border-slate-300" />Keep me signed in for 30 days</label>
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
