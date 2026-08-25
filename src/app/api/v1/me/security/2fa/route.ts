import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { beginTwoFactorSetup, disableTwoFactor, enableTwoFactor, getTwoFactorStatus } from "@/server/auth/two-factor.service";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";
const codeSchema = z.object({ code: z.string().trim().min(6).max(32) });

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  return user;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    return apiSuccess(await getTwoFactorStatus(user.id));
  } catch (error) { return handleApiError(error, requestId); }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    return apiSuccess(await beginTwoFactorSetup(user.id, user.email));
  } catch (error) { return handleApiError(error, requestId); }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { code } = await readJson(request, codeSchema);
    return apiSuccess(await enableTwoFactor(user.id, code));
  } catch (error) { return handleApiError(error, requestId); }
}

export async function DELETE(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { code } = await readJson(request, codeSchema);
    await disableTwoFactor(user.id, code);
    return apiSuccess({ message: "Two-factor authentication disabled." });
  } catch (error) { return handleApiError(error, requestId); }
}
