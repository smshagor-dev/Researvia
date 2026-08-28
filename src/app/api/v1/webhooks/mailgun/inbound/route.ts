import { NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { receiveMailgunMessage, verifyMailgunInboundSignature } from "@/server/email/system-mailbox.service";
import { queueVacationReplyForInboundMessage } from "@/server/email/vacation-responder.service";
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
    const inboundMessageId = "messageId" in result && result.messageId ? String(result.messageId) : null;
    let vacationReply: Awaited<ReturnType<typeof queueVacationReplyForInboundMessage>> | null = null;
    if (result.accepted && inboundMessageId) {
      try {
        vacationReply = await queueVacationReplyForInboundMessage(inboundMessageId);
      } catch {
        // Inbound delivery has already been persisted. A responder failure must not make Mailgun redeliver the message.
        vacationReply = { queued: false, reason: "queue-error" };
      }
    }
    // Unknown/closed local recipients are acknowledged to prevent repeated delivery attempts.
    return apiSuccess({ ...result, vacationReply });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
