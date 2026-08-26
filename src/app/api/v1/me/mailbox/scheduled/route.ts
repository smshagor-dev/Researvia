import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { listScheduledSystemMail, scheduleSystemMail } from "@/server/email/scheduled-mail.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  to: z.array(z.string().email()).min(1).max(20),
  cc: z.array(z.string().email()).max(20).default([]),
  subject: z.string().max(500).default(""),
  text: z.string().min(1).max(200_000),
  replyToMessageId: z.string().nullable().optional(),
  draftId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime()
}).strict();

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    return apiSuccess({ messages: await listScheduledSystemMail(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("mailbox:schedule", user.id, 40, 60 * 60 * 1000);
    const input = await readJson(request, schema);
    const message = await scheduleSystemMail(user.id, { ...input, scheduledAt: new Date(input.scheduledAt) });
    return apiSuccess({ message }, 201);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
