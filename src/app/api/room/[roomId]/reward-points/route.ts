import { NextRequest, NextResponse } from "next/server";
import { adminRealtimeDb, adminFirestore } from "@/lib/firebase/admin";

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params;
    const { secret } = (await req.json()) as { secret?: string };
    const AUTO_GAME_SECRET = process.env.AUTO_GAME_SECRET || "auto-game-secret-key";
    if (secret !== AUTO_GAME_SECRET) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const currentSnap = await adminRealtimeDb.ref(`games/${roomId}/current`).get();
    if (!currentSnap.exists()) {
      return NextResponse.json({ error: "게임 없음" }, { status: 404 });
    }

    const current = currentSnap.val() as {
      phase?: string;
      scores?: Record<string, number>;
      nameMap?: Record<string, string>;
      reward?: { type: string; amount: number; label: string };
      rewardDistributed?: boolean;
    };

    if (current.phase !== "final_result") {
      return NextResponse.json({ error: "게임이 아직 안 끝남" }, { status: 400 });
    }

    if (current.rewardDistributed) {
      return NextResponse.json({ error: "이미 보상 지급됨" }, { status: 409 });
    }

    const scores = current.scores || {};
    const nameMap = current.nameMap || {};
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      return NextResponse.json({ error: "참가자 없음" }, { status: 400 });
    }

    const rewardAmount = current.reward?.amount || 100;

    const [winnerId, winnerScore] = sorted[0];
    const winnerName = nameMap[winnerId] || winnerId.slice(0, 6);

    const userRef = adminFirestore.collection("users").doc(winnerId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const currentPoints = userData?.points || 0;
    await userRef.update({
      points: currentPoints + rewardAmount,
    });

    if (sorted.length >= 2) {
      const [secondId] = sorted[1];
      const secondDoc = await adminFirestore.collection("users").doc(secondId).get();
      await adminFirestore.collection("users").doc(secondId).update({
        points: (secondDoc.data()?.points || 0) + Math.floor(rewardAmount / 2),
      });
    }
    if (sorted.length >= 3) {
      const [thirdId] = sorted[2];
      const thirdDoc = await adminFirestore.collection("users").doc(thirdId).get();
      await adminFirestore.collection("users").doc(thirdId).update({
        points: (thirdDoc.data()?.points || 0) + Math.floor(rewardAmount / 4),
      });
    }

    await adminRealtimeDb.ref(`games/${roomId}/current/rewardDistributed`).set(true);

    await adminRealtimeDb.ref(`chat/${roomId}/messages`).push({
      uid: "BOT_HOST",
      displayName: "🤖 자동게임봇",
      message: `🏆 게임 종료! 1등 ${winnerName}(${winnerScore}점) → +${rewardAmount}P | 2등 +${Math.floor(rewardAmount / 2)}P | 3등 +${Math.floor(rewardAmount / 4)}P`,
      timestamp: Date.now(),
      isBot: true,
      isSystem: false,
      type: "bot",
    });

    return NextResponse.json({
      success: true,
      winner: { uid: winnerId, name: winnerName, score: winnerScore, reward: rewardAmount },
    });
  } catch (error) {
    console.error("Reward points error:", error);
    return NextResponse.json({ error: "보상 지급 실패" }, { status: 500 });
  }
}
