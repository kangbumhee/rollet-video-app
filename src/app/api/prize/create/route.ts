// ============================================
// 파일: src/app/api/prize/create/route.ts
// 설명: 관리자 경품 생성 API
//       이미지 URL → Gemini → 자동 설명
//       Zod 검증 적용
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { adminFirestore, verifyAuth } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { generatePrizeCaption } from "@/lib/gemini/caption";
import { CreatePrizeSchema } from "@/lib/validations/schemas";
import { apiError, zodError, ERROR_CODES } from "@/lib/api/errors";
import { getNextAvailableSlot } from "@/lib/room/scheduler";
import { ZodError } from "zod";

const ADMIN_UID = process.env.ADMIN_UID;

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return apiError(ERROR_CODES.AUTH_REQUIRED, "로그인 필요", 401);

  // 관리자 확인
  if (user.uid !== ADMIN_UID) {
    return apiError(ERROR_CODES.AUTH_FORBIDDEN, "관리자 권한 필요", 403);
  }

  const body = await req.json();
  let validated;
  try {
    validated = CreatePrizeSchema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) return zodError(e);
    throw e;
  }

  const { imageURL, title, gameType } = validated;

  // AI 설명 생성
  let prizeTitle = title || "";
  let prizeDescription = "";
  let estimatedValue = 0;

  try {
    const aiResult = await generatePrizeCaption(imageURL);
    prizeTitle = prizeTitle || aiResult.title;
    prizeDescription = aiResult.description;
    estimatedValue = aiResult.estimatedValue;
  } catch (error) {
    console.error("AI 설명 생성 실패:", error);
    prizeTitle = prizeTitle || "경품";
    prizeDescription = "멋진 경품이 준비되어 있습니다!";
  }

  // [보강⑥] 다음 가용 슬롯 예약
  const nextSlot = await getNextAvailableSlot();

  // Firestore 저장
  const db = adminFirestore;
  const roomRef = db.collection("rooms").doc();

  const roomData = {
    id: roomRef.id,
    ownerId: user.uid,
    ownerType: "PLATFORM",
    prize: {
      imageURL,
      title: prizeTitle,
      description: prizeDescription,
      estimatedValue,
    },
    deliveryType: "SELF_DELIVERY",
    gameType,
    status: "APPROVED",
    entryMethod: "AD",
    scheduledAt: nextSlot.getTime(),
    participants: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await roomRef.set(roomData);

  return NextResponse.json({
    success: true,
    roomId: roomRef.id,
    prize: {
      title: prizeTitle,
      description: prizeDescription,
      estimatedValue,
    },
    scheduledAt: nextSlot.toISOString(),
    message: `경품 등록 완료! ${nextSlot.toLocaleString("ko-KR")}에 시작됩니다.`,
  });
}
