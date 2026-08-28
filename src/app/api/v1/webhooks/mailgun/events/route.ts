import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { recordMailgunDeliveryFeedback } from "@/server/email/deliverability.service";
import { verifyMailgunInboundSignature } from "@/server/email/system-mailbox.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

function row(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    await enforceRateLimit("mailgun:events", request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "mailgun", 1200, 60 * 60 * 1000);
    const body = row(await request.json());
    const signature = row(body.signature);
    const timestamp = String(signature.timestamp ?? "");
    const token = String(signature.token ?? "");
    const signed = String(signature.signature ?? "");
    if (!timestamp || !token || !signed || !verifyMailgunInboundSignature({ timestamp, token, signature: signed })) {
      throw new AppError("INVALID_MAILGUN_SIGNATURE", 401, "Mailgun delivery-event signature is invalid or expired.");
    }

    const eventData = row(body["event-data"]);
    const deliveryStatus = row(eventData["delivery-status"]);
    const message = row(eventData.message);
    const headers = row(message.headers);
    const result = await recordMailgunDeliveryFeedback({
      providerEventId: eventData.id ? String(eventData.id) : null,
      event: String(eventData.event ?? "other"),
      recipient: String(eventData.recipient ?? ""),
      messageId: headers["message-id"] ? String(headers["message-id"]) : null,
      severity: eventData.severity ? String(eventData.severity) : null,
      reason: eventData.reason ? String(eventData.reason) : null,
      description: String(deliveryStatus.description ?? deliveryStatus.message ?? "") || null,
      timestamp: typeof eventData.timestamp === "number" || typeof eventData.timestamp === "string" ? eventData.timestamp : null
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
