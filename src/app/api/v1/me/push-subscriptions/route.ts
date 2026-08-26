import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import {
  countUserPushSubscriptions,
  getWebPushPublicConfig,
  removePushSubscription,
  upsertPushSubscription
} from "@/server/notifications/push.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(3000),
  expirationTime: z.number().finite().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(20).max(1000),
    auth: z.string().min(8).max(1000)
  }).strict()
}).strict();

const deleteSchema = z.object({ endpoint: z.string().url().max(3000) }).strict();

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    const config = getWebPushPublicConfig();
    return apiSuccess({ ...config, subscriptionCount: await countUserPushSubscriptions(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("push:subscription", user.id, 30, 60 * 60 * 1000);
    if (!getWebPushPublicConfig().enabled) throw new AppError("PUSH_NOT_CONFIGURED", 503, "Push notifications are not configured on this server.");
    const input = await readJson(request, subscriptionSchema);
    await upsertPushSubscription(user.id, input, request.headers.get("user-agent") ?? "");
    return apiSuccess({ subscribed: true, subscriptionCount: await countUserPushSubscriptions(user.id) }, 201);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("push:subscription", user.id, 30, 60 * 60 * 1000);
    const input = await readJson(request, deleteSchema);
    await removePushSubscription(user.id, input.endpoint);
    return apiSuccess({ subscribed: false, subscriptionCount: await countUserPushSubscriptions(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
