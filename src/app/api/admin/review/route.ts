// ============================================
// 파일: src/app/api/admin/review/route.ts
// 설명: 관리자 방 검수 승인/거절 API
//       거절 시 자동 환불 트리거
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { adminFirestore, verifyAuth } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { apiError, ERROR_CODES } from "@/lib/api/errors";
import { validateTransition, needsRefund } from "@/lib/room/stateMachine";
import { getNextAvailableSlot } from "@/lib/room/scheduler";
import { refundRoom } from "@/lib/payments/refund";

const ADMIN_UID = process.env.ADMIN_UID;

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user || user.uid !== ADMIN_UID) {
    return apiError(ERROR_CODES.AUTH_FORBIDDEN, "관리자 권한 필요", 403);
  }

  const { roomId, action, rejectReason } = (await req.json()) as {
    roomId?: string;
    action?: string;
    rejectReason?: string;
  };

  if (!roomId) {
    return apiError(ERROR_CODES.INVALID_INPUT, "roomId 필수", 400);
  }

  const db = adminFirestore;
  const roomRef = db.doc(`rooms/${roomId}`);
  const roomSnap = await roomRef.get();

  if (!roomSnap.exists) {
    return apiError(ERROR_CODES.ROOM_NOT_FOUND, "방 없음", 404);
  }

  const room = roomSnap.data()!;

  if (action === "approve") {
    // 상태 전이 검증
    validateTransition(room.status, "APPROVED");

    // [보강⑥] 빈 슬롯 예약
    const slot = await getNextAvailableSlot();

    await roomRef.update({
      status: "APPROVED",
      scheduledAt: slot.getTime(),
      updatedAt: Timestamp.now(),
    });

    // 셀러에게 알림
    await db.collection("notifications").add({
      uid: room.ownerId,
      type: "ROOM_APPROVED",
      title: "✅ 경품방이 승인되었습니다!",
      message: `${slot.toLocaleString("ko-KR")}에 시작됩니다.`,
      roomId,
      read: false,
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      scheduledAt: slot.toISOString(),
    });
  }

  if (action === "reject") {
    validateTransition(room.status, "REJECTED");

    await roomRef.update({
      status: "REJECTED",
      rejectReason: rejectReason || "관리자에 의해 거절됨",
      updatedAt: Timestamp.now(),
    });

    // [보강⑩] 유료 방이면 자동 환불
    if (needsRefund(room.status)) {
      const refundResult = await refundRoom(roomId, `검수 거절: ${rejectReason || "부적절한 콘텐츠"}`);

      // 셀러에게 알림 (환불 포함)
      await db.collection("notifications").add({
        uid: room.ownerId,
        type: "ROOM_REJECTED",
        title: "❌ 경품방이 거절되었습니다",
        message: `사유: ${rejectReason || "부적절한 콘텐츠"}. ${
          refundResult.success
            ? "결제 금액이 환불됩니다."
            : "환불 처리 중 문제가 발생했습니다. 고객센터에 문의해주세요."
        }`,
        roomId,
        read: false,
        createdAt: Timestamp.now(),
      });
    }

    return NextResponse.json({ success: true });
  }

  return apiError(ERROR_CODES.INVALID_INPUT, "action은 approve 또는 reject", 400);
}
