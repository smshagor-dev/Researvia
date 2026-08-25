import { NextResponse } from "next/server";
import { completeEmailConnection, type EmailProvider } from "@/server/email/email-account.service";
import { AppError } from "@/server/errors/AppError";
import { getRequestId, handleApiError } from "@/lib/api-response";
import { getServerEnv } from "@/config/env";

export const runtime = "nodejs";

function parseProvider(value: string): EmailProvider {
  const normalized = value.toUpperCase();
  if (normalized === "GOOGLE" || normalized === "MICROSOFT") return normalized;
  throw new AppError("UNSUPPORTED_EMAIL_PROVIDER", 404, "Unsupported email provider.");
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const requestId = getRequestId(request);
  try {
    const { provider } = await context.params;
    const url = new URL(request.url);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (!state || !code) throw new AppError("INVALID_OAUTH_CALLBACK", 400, "The provider did not return the expected authorization data.");
    await completeEmailConnection(parseProvider(provider), state, code);
    return NextResponse.redirect(`${getServerEnv().APP_URL}/dashboard/email-accounts?connected=1`);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
