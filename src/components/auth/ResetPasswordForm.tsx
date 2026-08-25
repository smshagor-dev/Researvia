"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return <Alert>This reset link is missing a token. Request a new password reset email.</Alert>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      if (!response.ok) {
        const apiError = await readClientApiError(response);
        setError(apiError.message);
        return;
      }
      setDone(true);
    } catch {
      setError("Unable to reset your password right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <Alert tone="success">Your password has been updated and all older sessions were signed out.</Alert>
        <Link href="/login" className="block rounded-lg bg-slate-950 px-4 py-2.5 text-center text-sm font-medium text-white">Continue to sign in</Link>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {error ? <Alert>{error}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Updating…" : "Update password"}</Button>
    </form>
  );
}
