import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore, adminRealtimeDb } from "@/lib/firebase/admin";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminFirestore.collection("users").doc(decoded.uid).get();
    const userData = userDoc.data();
    const isAdminOrMod = !!(userData?.isAdmin || userData?.isModerator);

    const currentSnap = await adminRealtimeDb.ref(`games/${roomId}/current`).get();
    if (currentSnap.exists()) {
      const gameData = currentSnap.val() as { startedBy?: string; phase?: string };

      if (roomId === "main" && !isAdminOrMod) {
        return NextResponse.json({ error: "매니저 권한이 필요합니다" }, { status: 403 });
      }

      if (roomId !== "main") {
        const isStarter = gameData.startedBy === decoded.uid;
        const isFinalResult = gameData.phase === 'final_result';
        if (!isStarter && !isAdminOrMod && !isFinalResult) {
          return NextResponse.json(
            { error: "게임을 시작한 사람만 중단할 수 있습니다" },
            { status: 403 }
          );
        }
      }
    }

    await adminRealtimeDb.ref(`games/${roomId}`).remove();

    await adminRealtimeDb.ref(`chat/${roomId}/messages`).push({
      uid: "BOT_HOST",
      displayName: "🎪 방장봇",
      message: "🔄 게임이 종료되었습니다. 새 게임을 시작할 수 있습니다.",
      timestamp: Date.now(),
      isBot: true,
      isSystem: false,
      type: "bot",
    });

    return NextResponse.json({ success: true, message: "게임이 초기화되었습니다" });
  } catch (error) {
    console.error("Reset game error:", error);
    return NextResponse.json({ error: "게임 초기화 실패" }, { status: 500 });
  }
}
