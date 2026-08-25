import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { scheduleCampaign } from "@/server/outreach/outreach.service";

export const runtime = "nodejs";
const schema = z.object({ scheduledAt: z.string().datetime().nullable().optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
    const { id } = await context.params;
    const input = await readJson(request, schema);
    return apiSuccess(await scheduleCampaign(user.id, id, input.scheduledAt ? new Date(input.scheduledAt) : undefined));
  } catch (error) { return handleApiError(error, requestId); }
}
