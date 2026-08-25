import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/server/errors/AppError";

export function getRequestId(request: Request): string {
  return request.headers.get("x-request-id")?.slice(0, 128) || randomUUID();
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function apiFailure(
  code: string,
  message: string,
  status: number,
  requestId: string,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId,
        ...(details === undefined ? {} : { details })
      }
    },
    { status }
  );
}

export function handleApiError(error: unknown, requestId: string): NextResponse {
  if (error instanceof AppError) {
    return apiFailure(error.code, error.message, error.status, requestId, error.details);
  }

  if (error instanceof ZodError) {
    return apiFailure(
      "VALIDATION_ERROR",
      "Please check the submitted information and try again.",
      400,
      requestId,
      error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    );
  }

  const name = error instanceof Error ? error.name : "UnknownError";
  console.error(`[${requestId}] Unhandled API error: ${name}`);
  return apiFailure("INTERNAL_ERROR", "Something went wrong. Please try again.", 500, requestId);
}
