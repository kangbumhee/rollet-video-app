// ============================================
// 파일: src/app/api/video/session/route.ts
// 설명: [보강⑤] 동영상 시청 세션 시작
//       서버에서 watchToken 발급
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebase/admin";
import { createWatchToken } from "@/lib/video/watchToken";
import { apiError, ERROR_CODES } from "@/lib/api/errors";

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return apiError(ERROR_CODES.AUTH_REQUIRED, "로그인 필요", 401);

  const body = await req.json();
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  if (!roomId) return apiError(ERROR_CODES.INVALID_INPUT, "roomId 필수", 400);

  const startTime = Date.now();
  const watchToken = createWatchToken(user.uid, roomId, startTime);

  return NextResponse.json({
    success: true,
    watchToken,
    startTime,
  });
}
