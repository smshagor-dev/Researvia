import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { listSystemMailSenderIdentities, updateSystemMailAlias } from "@/server/email/system-mail-alias.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const optionalEmail = z.union([z.string().trim().email().max(320), z.literal("")]);
const schema = z.object({
  label: z.string().max(80).optional(),
  displayName: z.string().max(120).optional(),
  replyTo: optionalEmail.optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  isDefault: z.boolean().optional()
}).strict().refine((value) => Object.keys(value).length > 0, "Provide at least one alias change.");

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  return user;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ aliasId: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("mailbox:aliases:update", user.id, 120, 60 * 60 * 1000);
    const [{ aliasId }, input] = await Promise.all([params, readJson(request, schema)]);
    await updateSystemMailAlias(user.id, aliasId, input);
    return apiSuccess({ identities: await listSystemMailSenderIdentities(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
