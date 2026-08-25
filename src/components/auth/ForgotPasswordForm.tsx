"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { readClientApiError } from "@/lib/client-api";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email") })
      });
      if (!response.ok) {
        const apiError = await readClientApiError(response);
        setError(apiError.message);
        return;
      }
      const payload = (await response.json()) as { data?: { message?: string } };
      setMessage(payload.data?.message || "If the account exists, a reset email has been sent.");
    } catch {
      setError("Unable to request a password reset right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={320} placeholder="you@university.edu" />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Sending…" : "Send reset link"}</Button>
    </form>
  );
}
