"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: form.get("displayName"),
          email: form.get("email"),
          password
        })
      });

      if (!response.ok) {
        const apiError = await readClientApiError(response);
        setError(apiError.message);
        return;
      }

      const payload = (await response.json()) as { data?: { email?: string } };
      const email = payload.data?.email || String(form.get("email") || "");
      window.location.assign(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Unable to create your account right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {error ? <Alert>{error}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="displayName">Full name</Label>
        <Input id="displayName" name="displayName" autoComplete="name" required minLength={2} maxLength={120} placeholder="Your full name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={320} placeholder="you@university.edu" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
        <p className="text-xs text-slate-500">Use at least 12 characters.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Creating account…" : "Create free account"}</Button>
      <p className="text-center text-xs leading-5 text-slate-500">ResearVia is free for students. No payment information is required.</p>
    </form>
  );
}
