// src/app/api/game/result/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase/admin";
import type { GameSession } from "@/types/game";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId가 필요합니다." }, { status: 400 });
    }

    const sessionDoc = await adminFirestore.doc(`gameSessions/${sessionId}`).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ success: false, error: "세션을 찾을 수 없습니다." }, { status: 404 });
    }

    const session = sessionDoc.data() as GameSession;

    return NextResponse.json({
      success: true,
      data: {
        id: session.id,
        gameType: session.gameType,
        phase: session.phase,
        winnerId: session.winnerId,
        participantCount: session.participants.length,
        currentRound: session.currentRound,
        totalRounds: session.totalRounds,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
      },
    });
  } catch (error) {
    console.error("Game result error:", error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
