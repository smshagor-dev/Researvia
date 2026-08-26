import { NextRequest } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/api-request";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { listSystemMailbox, saveSystemMailDraft } from "@/server/email/system-mailbox.service";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const folderSchema = z.enum(["INBOX", "STARRED", "SENT", "DRAFTS", "TRASH"]);
const draftSchema = z.object({
  id: z.string().optional(),
  to: z.array(z.string().email()).max(20).optional(),
  cc: z.array(z.string().email()).max(20).optional(),
  subject: z.string().max(500).optional(),
  text: z.string().max(200_000).optional()
}).strict();

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
  return user;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const user = await requireUser();
    const folder = folderSchema.catch("INBOX").parse(request.nextUrl.searchParams.get("folder") ?? "INBOX");
    const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 200);
    return apiSuccess(await listSystemMailbox(user.id, { folder, query }));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    await enforceRateLimit("mailbox:draft", user.id, 240, 60 * 60 * 1000);
    const input = await readJson(request, draftSchema);
    return apiSuccess({ message: await saveSystemMailDraft(user.id, input) }, input.id ? 200 : 201);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
