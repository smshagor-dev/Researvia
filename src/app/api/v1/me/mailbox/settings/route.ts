import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { ensureSystemMailbox } from "@/server/email/system-mailbox.service";
import { getSystemMailSettings, updateSystemMailSettings } from "@/server/email/system-mail-settings.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const optionalEmail = z.union([z.string().trim().email().max(320), z.literal("")]);
const schema = z.object({
  deliveryMode: z.enum(["MANAGED", "CUSTOM"]).optional(),
  senderName: z.string().max(120).optional(),
  signature: z.string().max(4000).optional(),
  replyTo: optionalEmail.optional(),
  forwardingEnabled: z.boolean().optional(),
  forwardingEmail: optionalEmail.optional(),
  webNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smtpHost: z.string().trim().max(255).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUsername: z.string().trim().max(320).optional(),
  smtpPassword: z.string().max(1024).optional(),
  imapHost: z.string().trim().max(255).optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  imapSecure: z.boolean().optional(),
  imapUsername: z.string().trim().max(320).optional(),
  imapPassword: z.string().max(1024).optional(),
  imapSyncEnabled: z.boolean().optional(),
  imapMailbox: z.string().trim().min(1).max(255).optional()
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one mailbox setting.");

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    const [mailbox, settings] = await Promise.all([ensureSystemMailbox(user.id), getSystemMailSettings(user.id)]);
    return apiSuccess({ mailbox: { address: mailbox.address, displayName: mailbox.displayName, status: mailbox.status }, settings });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("mailbox:settings", user.id, 60, 60 * 60 * 1000);
    const input = await readJson(request, schema);
    const settings = await updateSystemMailSettings(user.id, input);
    return apiSuccess({ settings });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
