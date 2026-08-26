import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, getRequestId, handleApiError } from "@/lib/api-response";
import { assertSameOrigin } from "@/server/auth/request";
import { getCurrentUser } from "@/server/auth/session";
import { sendSystemMailMessage } from "@/server/email/system-mailbox.service";
import { AppError } from "@/server/errors/AppError";
import { enforceRateLimit } from "@/server/security/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  to: z.array(z.string().email()).min(1).max(20),
  cc: z.array(z.string().email()).max(20).default([]),
  subject: z.string().max(500).default(""),
  text: z.string().min(1).max(200_000),
  replyToMessageId: z.string().nullable().optional(),
  draftId: z.string().nullable().optional()
}).strict();

function parseList(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Accept comma-separated addresses from simple clients.
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", 401, "Sign in to continue.");
    await enforceRateLimit("mailbox:send", user.id, 80, 60 * 60 * 1000);

    const form = await request.formData();
    const input = schema.parse({
      to: parseList(form.get("to")),
      cc: parseList(form.get("cc")),
      subject: String(form.get("subject") ?? ""),
      text: String(form.get("text") ?? ""),
      replyToMessageId: form.get("replyToMessageId") ? String(form.get("replyToMessageId")) : null,
      draftId: form.get("draftId") ? String(form.get("draftId")) : null
    });
    const files = form.getAll("attachments").filter((value): value is File => typeof value !== "string" && value instanceof File);
    const message = await sendSystemMailMessage(user.id, input, files);
    return apiSuccess({ message }, 201);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
