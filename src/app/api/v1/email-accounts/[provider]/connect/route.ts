import { NextResponse } from "next/server";
import { beginEmailConnection, type EmailProvider } from "@/server/email/email-account.service";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { getRequestId, handleApiError } from "@/lib/api-response";

export const runtime = "nodejs";

function parseProvider(value: string): EmailProvider {
  const normalized = value.toUpperCase();
  if (normalized === "GOOGLE" || normalized === "MICROSOFT") return normalized;
  throw new AppError("UNSUPPORTED_EMAIL_PROVIDER", 404, "Unsupported email provider.");
}

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const requestId = getRequestId(request);
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
    const { provider } = await context.params;
    const url = await beginEmailConnection(user.id, parseProvider(provider));
    return NextResponse.redirect(url);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
