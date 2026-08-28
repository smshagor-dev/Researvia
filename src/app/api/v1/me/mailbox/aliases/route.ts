import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { createSystemMailAlias, listSystemMailSenderIdentities } from "@/server/email/system-mail-alias.service";
import { ensureSystemMailbox } from "@/server/email/system-mailbox.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const optionalEmail = z.union([z.string().trim().email().max(320), z.literal("")]);
const createSchema = z.object({
  localPart: z.string().trim().min(3).max(40),
  label: z.string().max(80).optional(),
  displayName: z.string().max(120).optional(),
  replyTo: optionalEmail.optional(),
  isDefault: z.boolean().optional()
}).strict();

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  await ensureSystemMailbox(user.id);
  return user;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    return apiSuccess({ identities: await listSystemMailSenderIdentities(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("mailbox:aliases:create", user.id, 20, 24 * 60 * 60 * 1000);
    const input = await readJson(request, createSchema);
    await createSystemMailAlias(user.id, input);
    return apiSuccess({ identities: await listSystemMailSenderIdentities(user.id) }, 201);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
