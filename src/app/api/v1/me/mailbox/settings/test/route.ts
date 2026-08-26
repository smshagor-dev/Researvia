import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { sendSystemMailMessage } from "@/server/email/system-mailbox.service";
import { testSystemMailImap, testSystemMailSmtp } from "@/server/email/system-mail-settings.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";
const schema = z.object({ action: z.enum(["SMTP", "IMAP", "DELIVERY"]) }).strict();

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
    await enforceRateLimit("mailbox:test", user.id, 20, 60 * 60 * 1000);
    const input = await readJson(request, schema);
    if (input.action === "SMTP") return apiSuccess(await testSystemMailSmtp(user.id));
    if (input.action === "IMAP") return apiSuccess(await testSystemMailImap(user.id));

    const message = await sendSystemMailMessage(user.id, {
      to: [user.email],
      subject: "ResearVia mailbox delivery test",
      text: "This is a delivery test from your ResearVia system mailbox. If you received it, your outbound mail configuration is working."
    });
    return apiSuccess({ ok: true, messageId: message.id });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
