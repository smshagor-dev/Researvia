import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { exportStudentPortableData, importStudentPortableData } from "@/server/profile/user-data-portability.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const importSchema = z.object({
  mode: z.enum(["MERGE", "REPLACE"]).default("MERGE"),
  data: z.unknown()
}).strict();

function normalizeExport(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const row = value as Record<string, unknown>;
  return { version: row.version, personal: row.personal, sections: row.sections };
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
    await enforceRateLimit("profile:export", user.id, 20, 60 * 60 * 1000);
    const data = await exportStudentPortableData(user.id);
    return apiSuccess({ export: data });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
    await enforceRateLimit("profile:import", user.id, 10, 60 * 60 * 1000);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2 * 1024 * 1024) throw new AppError("PROFILE_IMPORT_TOO_LARGE", 413, "Profile import files must be 2 MB or smaller.");
    const input = importSchema.parse(await request.json());
    const result = await importStudentPortableData(user.id, normalizeExport(input.data), input.mode);
    return apiSuccess({ result });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
