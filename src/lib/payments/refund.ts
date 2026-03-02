// ============================================
// 파일: src/lib/payments/refund.ts
// 설명: [보강⑩] 환불 처리
//       검수 거절/취소 시 자동 환불
//       실패 재시도 + 수동 처리 큐
// ============================================

import { adminFirestore } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { cancelPayment } from "@/lib/payments/toss";

const MAX_RETRY = 3;

export interface RefundResult {
  success: boolean;
  message: string;
  refundId?: string;
}

/**
 * 방에 연결된 결제 환불 처리
 */
export async function refundRoom(roomId: string, reason: string): Promise<RefundResult> {
  const db = adminFirestore;

  // 결제 내역 조회
  const paymentSnap = await db
    .collection("payments")
    .where("roomId", "==", roomId)
    .where("status", "==", "COMPLETED")
    .limit(1)
    .get();

  if (paymentSnap.empty) {
    return { success: true, message: "환불할 결제 없음 (무료 방)" };
  }

  const paymentDoc = paymentSnap.docs[0];
  const payment = paymentDoc.data();

  // 이미 환불됐는지 확인
  if (payment.refundStatus === "REFUNDED") {
    return { success: true, message: "이미 환불 완료" };
  }

  // 토스페이먼츠 환불 시도
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const result = await cancelPayment(payment.paymentKey, reason);

      if (result.success) {
        // 성공: 결제 상태 업데이트
        await paymentDoc.ref.update({
          refundStatus: "REFUNDED",
          refundReason: reason,
          refundedAt: Timestamp.now(),
          refundResponse: result.data,
        });

        return {
          success: true,
          message: "환불 완료",
          refundId: paymentDoc.id,
        };
      }

      lastError = result.error || "알 수 없는 오류";
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : "알 수 없는 오류";
    }

    // 재시도 전 대기 (1초, 2초, 4초)
    if (attempt < MAX_RETRY) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  // 모든 재시도 실패 → 수동 처리 큐에 등록
  await db.collection("refundQueue").add({
    roomId,
    paymentId: paymentDoc.id,
    paymentKey: payment.paymentKey,
    amount: payment.amount,
    reason,
    error: lastError,
    retryCount: MAX_RETRY,
    status: "FAILED",
    createdAt: Timestamp.now(),
  });

  // 관리자 알림
  await db.collection("notifications").add({
    uid: process.env.ADMIN_UID,
    type: "REFUND_FAILED",
    title: "⚠️ 환불 실패 - 수동 처리 필요",
    message: `방 ${roomId} / 결제 ${payment.paymentKey} / 사유: ${lastError}`,
    read: false,
    createdAt: Timestamp.now(),
  });

  return {
    success: false,
    message: `환불 실패 (${MAX_RETRY}회 재시도). 수동 처리 큐에 등록됨.`,
  };
}
