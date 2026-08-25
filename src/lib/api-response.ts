import { NextResponse } from "next/server";

export type ApiErrorCode = "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_ERROR";

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function apiError(code: ApiErrorCode, message: string, status: number, requestId?: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(requestId ? { requestId } : {})
      }
    },
    { status }
  );
}
