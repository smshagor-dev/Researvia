import { NextRequest } from "next/server";
import { getRequestId, handleApiError } from "@/lib/api-response";
import { getCurrentUser } from "@/server/auth/session";
import { readSystemMailAttachment } from "@/server/email/system-mailbox.service";
import { AppError } from "@/server/errors/AppError";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; fileId: string }> };

function safeDispositionName(value: string) {
  return value.replace(/["\r\n\\/]+/g, "_").slice(0, 180) || "attachment";
}

export async function GET(request: NextRequest, context: Context) {
  const requestId = getRequestId(request);
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
    const { id, fileId } = await context.params;
    const attachment = await readSystemMailAttachment(user.id, id, fileId);
    return new Response(attachment.buffer, {
      headers: {
        "content-type": attachment.contentType || "application/octet-stream",
        "content-disposition": `attachment; filename="${safeDispositionName(attachment.filename)}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
