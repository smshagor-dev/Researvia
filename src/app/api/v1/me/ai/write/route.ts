import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { generateAcademicDraft } from "@/server/ai/ai.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";
const schema = z.object({ type: z.enum(["EMAIL", "SOP", "PROPOSAL"]), context: z.string().max(8000).default("") });

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
    await enforceRateLimit("ai:write", user.id, 30, 60 * 60 * 1000);
    const input = await readJson(request, schema);
    return apiSuccess(await generateAcademicDraft(user.id, input.type, input.context));
  } catch (error) { return handleApiError(error, requestId); }
}
