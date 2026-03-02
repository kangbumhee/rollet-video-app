// ============================================
// 파일: src/lib/api/errors.ts
// 설명: [보강③] API 에러 코드 표준 + 핸들러
// ============================================

import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ── 에러 코드 정의 ──
export const ERROR_CODES = {
  // 인증
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  AUTH_INVALID_TOKEN: "AUTH_INVALID_TOKEN",

  // 검증
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // 방
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_INVALID_STATE: "ROOM_INVALID_STATE",
  ROOM_SLOT_CONFLICT: "ROOM_SLOT_CONFLICT",

  // 결제
  PAYMENT_AMOUNT_MISMATCH: "PAYMENT_AMOUNT_MISMATCH",
  PAYMENT_ALREADY_CONFIRMED: "PAYMENT_ALREADY_CONFIRMED",
  PAYMENT_FAILED: "PAYMENT_FAILED",

  // 동영상
  VIDEO_NOT_WATCHED: "VIDEO_NOT_WATCHED",
  VIDEO_ALREADY_WATCHED: "VIDEO_ALREADY_WATCHED",
  VIDEO_INVALID_TOKEN: "VIDEO_INVALID_TOKEN",

  // 일반
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ── 표준 에러 응답 생성 ──
export function apiError(code: ErrorCode, message: string, status: number = 400, details?: unknown) {
  return NextResponse.json(
    { error: message, code, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}

// ── Zod 에러 → 표준 에러 변환 ──
export function zodError(error: ZodError) {
  const formatted = error.issues.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
  return apiError(ERROR_CODES.VALIDATION_ERROR, "입력값이 올바르지 않습니다", 400, formatted);
}

// ── API Route 래퍼 (Zod 자동 검증) ──
export function withValidation<T>(
  schema: { parse: (data: unknown) => T },
  handler: (validated: T, req: Request) => Promise<NextResponse>
) {
  return async (req: Request) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return handler(validated, req);
    } catch (error) {
      if (error instanceof ZodError) {
        return zodError(error);
      }
      console.error("API 오류:", error);
      return apiError(ERROR_CODES.INTERNAL_ERROR, "서버 오류", 500);
    }
  };
}
