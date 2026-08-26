import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { getProfileSectionSchema, profileSectionKeySchema } from "@/schemas/student-profile-sections";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { createOrReplaceStudentProfileSection, getStudentProfileSection } from "@/server/profile/profile-sections.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

type Context = { params: Promise<{ section: string }> };

async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  if (user.role !== "STUDENT") throw new AppError("FORBIDDEN", 403, "Student access is required.");
  return user;
}

async function sectionFrom(context: Context) {
  return profileSectionKeySchema.parse((await context.params).section);
}

export async function GET(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    const user = await requireStudent();
    const section = await sectionFrom(context);
    return apiSuccess({ section, value: await getStudentProfileSection(user.id, section) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const section = await sectionFrom(context);
    await enforceRateLimit("profile:section", user.id, 240, 60 * 60 * 1000);
    const input = await readJson(request, getProfileSectionSchema(section));
    return apiSuccess({ section, item: await createOrReplaceStudentProfileSection(user.id, section, input) }, 201);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
