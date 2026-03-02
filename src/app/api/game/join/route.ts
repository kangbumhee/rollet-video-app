// src/app/api/game/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebase/admin";
import { joinGame } from "@/lib/game/engine";
import type { GameParticipant } from "@/types/game";

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "인증이 필요합니다." }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await verifyAuth(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: "유효하지 않은 토큰입니다." }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, roomId, displayName, photoURL, level } = body as {
      sessionId?: string;
      roomId?: string;
      displayName?: string;
      photoURL?: string;
      level?: number;
    };

    if (!sessionId || !roomId) {
      return NextResponse.json({ success: false, error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    const participant: GameParticipant = {
      uid: decoded.uid,
      displayName: displayName || "익명",
      photoURL: photoURL || undefined,
      level: level || 1,
      joinedAt: Date.now(),
      eliminated: false,
    };

    const result = await joinGame(sessionId, roomId, participant);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Game join error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
