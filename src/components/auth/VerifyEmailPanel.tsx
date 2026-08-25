"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

export function VerifyEmailPanel({ token, initialEmail }: { token: string; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function verify() {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/verify-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });
      if (!response.ok) {
        const apiError = await readClientApiError(response);
        setError(apiError.message);
        return;
      }
      setVerified(true);
      setMessage("Your account is verified. You can now sign in.");
    } catch {
      setError("Unable to verify your account right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (!response.ok) {
        const apiError = await readClientApiError(response);
        setError(apiError.message);
        return;
      }
      setMessage("If this account needs verification, a new email has been sent.");
    } catch {
      setError("Unable to resend the verification email right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      {token && !verified ? (
        <Button type="button" className="w-full" onClick={verify} disabled={submitting}>{submitting ? "Verifying…" : "Verify email address"}</Button>
      ) : null}
      {verified ? (
        <Link href="/login" className="block rounded-lg bg-slate-950 px-4 py-2.5 text-center text-sm font-medium text-white">Continue to sign in</Link>
      ) : (
        <form onSubmit={resend} className="space-y-4 border-t border-slate-100 pt-5">
          <div className="space-y-2">
            <Label htmlFor="email">Need a new verification link?</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} placeholder="you@university.edu" />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={submitting}>{submitting ? "Sending…" : "Resend verification email"}</Button>
        </form>
      )}
    </div>
  );
}
