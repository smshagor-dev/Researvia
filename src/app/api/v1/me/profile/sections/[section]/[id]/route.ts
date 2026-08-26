import { NextRequest } from "next/server";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { getProfileSectionPatchSchema, profileSectionKeySchema } from "@/schemas/student-profile-sections";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { queueProfessorMatchEvaluation } from "@/server/profile/professor-match-notification.service";
import { deleteStudentProfileSectionRecord, updateStudentProfileSectionRecord } from "@/server/profile/profile-sections.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

type Context = { params: Promise<{ section: string; id: string }> };

async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  if (user.role !== "STUDENT") throw new AppError("FORBIDDEN", 403, "Student access is required.");
  return user;
}

async function valuesFrom(context: Context) {
  const params = await context.params;
  return { section: profileSectionKeySchema.parse(params.section), id: params.id };
}

async function queueMatching(userId: string, section: string) {
  try {
    await queueProfessorMatchEvaluation(userId, `profile-section:${section}`);
  } catch (error) {
    console.error("Unable to queue professor match evaluation after profile section change.", error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const { section, id } = await valuesFrom(context);
    await enforceRateLimit("profile:section", user.id, 240, 60 * 60 * 1000);
    const input = await readJson(request, getProfileSectionPatchSchema(section));
    const item = await updateStudentProfileSectionRecord(user.id, section, id, input);
    await queueMatching(user.id, section);
    return apiSuccess({ section, item });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    const { section, id } = await valuesFrom(context);
    await enforceRateLimit("profile:section", user.id, 240, 60 * 60 * 1000);
    await deleteStudentProfileSectionRecord(user.id, section, id);
    await queueMatching(user.id, section);
    return apiSuccess({ section, deleted: true });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
