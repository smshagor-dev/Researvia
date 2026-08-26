import { NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { receiveMailgunMessage, verifyMailgunInboundSignature } from "@/server/email/system-mailbox.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    await enforceRateLimit("mailgun:inbound", request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "mailgun", 600, 60 * 60 * 1000);
    const form = await request.formData();
    const timestamp = String(form.get("timestamp") ?? "");
    const token = String(form.get("token") ?? "");
    const signature = String(form.get("signature") ?? "");
    if (!timestamp || !token || !signature || !verifyMailgunInboundSignature({ timestamp, token, signature })) {
      throw new AppError("INVALID_MAILGUN_SIGNATURE", 401, "Inbound email signature is invalid or expired.");
    }

    const result = await receiveMailgunMessage(form);
    // Unknown/closed local recipients are acknowledged to prevent repeated delivery attempts.
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
