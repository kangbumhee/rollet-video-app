// src/app/api/game/action/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/firebase/admin";
import { submitRPSChoice } from "@/lib/game/engine";
import type { RPSChoice } from "@/types/game";

const VALID_RPS_CHOICES: RPSChoice[] = ["rock", "paper", "scissors"];

export async function POST(req: NextRequest) {
  try {
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
    const { sessionId, matchId, roundNumber, type, payload } = body as {
      sessionId?: string;
      roomId?: string;
      matchId?: string;
      roundNumber?: number;
      type?: string;
      payload?: { choice?: RPSChoice };
    };

    // 유효성 검사
    if (!sessionId || !matchId || roundNumber === undefined || !type || !payload) {
      return NextResponse.json({ success: false, error: "필수 파라미터가 누락되었습니다." }, { status: 400 });
    }

    // 가위바위보 액션 처리
    if (type === "rps_choice") {
      const choice = payload.choice as RPSChoice;
      if (!VALID_RPS_CHOICES.includes(choice)) {
        return NextResponse.json({ success: false, error: "유효하지 않은 선택입니다." }, { status: 400 });
      }

      // roomId는 sessionId에서 조회하거나 body에서 받음
      // 여기서는 간단히 body에서 받는다고 가정 (프로덕션에서는 세션에서 조회)
      const roomId = body.roomId || "main";

      const result = await submitRPSChoice(sessionId, roomId, roundNumber, matchId, decoded.uid, choice);

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "지원하지 않는 액션 타입입니다." }, { status: 400 });
  } catch (error) {
    console.error("Game action error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
