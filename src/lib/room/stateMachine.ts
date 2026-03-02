// ============================================
// 파일: src/lib/room/stateMachine.ts
// 설명: [보강] Room 상태 전이 규칙 정의
//       허용되지 않은 전이는 에러 발생
// ============================================

import { RoomStatus } from "@/types/room";

// 허용된 상태 전이 매핑
const VALID_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "PENDING_REVIEW", "CANCELLED"],
  PENDING_PAYMENT: ["PENDING_REVIEW", "CANCELLED"],
  PENDING_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["LIVE", "CANCELLED"],
  LIVE: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

/**
 * 상태 전이가 유효한지 검증
 */
export function canTransition(from: RoomStatus, to: RoomStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 상태 전이 실행 (검증 포함)
 * 실패 시 Error throw
 */
export function validateTransition(from: RoomStatus, to: RoomStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `허용되지 않은 상태 전이: ${from} → ${to}. ` + `허용된 전이: ${VALID_TRANSITIONS[from]?.join(", ") || "없음"}`
    );
  }
}

/**
 * 취소 가능한 상태인지 확인
 */
export function isCancellable(status: RoomStatus): boolean {
  return ["DRAFT", "PENDING_PAYMENT", "APPROVED"].includes(status);
}

/**
 * 환불 필요한 상태인지 확인
 */
export function needsRefund(status: RoomStatus): boolean {
  return ["PENDING_REVIEW", "APPROVED"].includes(status);
}
