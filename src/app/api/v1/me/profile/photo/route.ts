import { NextRequest } from "next/server";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { deleteStudentProfilePhoto, readStudentProfilePhoto, uploadStudentProfilePhoto } from "@/server/profile/profile-photo.service";
import { getStudentProfile } from "@/server/profile/profile.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

async function requireStudent() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  if (user.role !== "STUDENT") throw new AppError("FORBIDDEN", 403, "Student access is required.");
  return user;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await requireStudent();
    const photo = await readStudentProfilePhoto(user.id);
    return new Response(photo.buffer, {
      status: 200,
      headers: {
        "content-type": photo.mimeType,
        "content-length": String(photo.buffer.length),
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    await enforceRateLimit("profile:photo", user.id, 30, 60 * 60 * 1000);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("PROFILE_PHOTO_REQUIRED", 400, "Choose a profile photo to upload.");
    await uploadStudentProfilePhoto(user.id, file);
    return apiSuccess({ profile: await getStudentProfile(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireStudent();
    await enforceRateLimit("profile:photo", user.id, 30, 60 * 60 * 1000);
    await deleteStudentProfilePhoto(user.id);
    return apiSuccess({ profile: await getStudentProfile(user.id) });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
