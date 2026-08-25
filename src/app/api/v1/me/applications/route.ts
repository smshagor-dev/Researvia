import { type NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { applicationListQuerySchema, createApplicationSchema } from "@/schemas/applications";
import { createApplication, listApplications } from "@/server/applications/application.service";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
  return user;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    const input = applicationListQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return apiSuccess({ applications: await listApplications(user.id, input) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = await readJson(request, createApplicationSchema);
    return apiSuccess({ application: await createApplication(user.id, input) }, 201);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
