import { NextResponse } from "next/server";

/**
 * One response envelope for every route handler, so clients only ever parse
 * one shape:
 *   { success: true, data }
 *   { success: false, error: { code, message } }
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "NOT_CONFIGURED"
  | "SERVER_ERROR";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true as const, data }, { status });
}

const statusByCode: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  NOT_CONFIGURED: 503,
  SERVER_ERROR: 500,
};

export function apiError(code: ApiErrorCode, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { success: false as const, error: { code, message, ...extra } },
    { status: statusByCode[code] },
  );
}
