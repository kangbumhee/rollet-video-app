// functions/src/game/processRound.ts
// Firebase Cloud Function – 라운드 자동 처리
// 5초 타이머 종료 후 호출됨

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

const CHOICE_WINS: Record<string, string> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

function generateBotChoice(): string {
  const choices = ["rock", "paper", "scissors"];
  return choices[Math.floor(Math.random() * 3)];
}

function resolveRPS(c1: string | null, c2: string | null): "player1" | "player2" | "draw" {
  if (!c1 && !c2) return "draw";
  if (!c1) return "player2";
  if (!c2) return "player1";
  if (c1 === c2) return "draw";
  return CHOICE_WINS[c1] === c2 ? "player1" : "player2";
}

export const processGameRound = onCall({ region: "asia-northeast3" }, async (request) => {
  const { sessionId, roomId, roundNumber } = request.data;

  if (!sessionId || !roomId || roundNumber === undefined) {
    throw new HttpsError("invalid-argument", "Missing required parameters");
  }

  const db = getFirestore();
  const rtdb = getDatabase();

  // 1. Firestore에서 세션 조회
  const sessionRef = db.doc(`gameSessions/${sessionId}`);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError("not-found", "Session not found");
  }

  const session = sessionSnap.data()!;
  const round = session.rounds?.[roundNumber];
  if (!round) {
    throw new HttpsError("not-found", "Round not found");
  }

  // 2. Realtime DB에서 선택 가져오기
  const choicesSnap = await rtdb.ref(`games/${roomId}/choices/${roundNumber}`).get();
  const allChoices = choicesSnap.val() || {};

  const winners: string[] = [];
  const losers: string[] = [];
  const matchResults: Record<string, unknown> = {};

  // 3. 각 매치업 처리
  for (const match of round.matchups) {
    const matchChoices = allChoices[match.matchId] || {};
    const p1Choice = matchChoices[match.player1Id]?.choice || null;
    let p2Choice: string | null;

    if (match.player2Id === "BOT") {
      p2Choice = generateBotChoice();
    } else {
      p2Choice = matchChoices[match.player2Id]?.choice || null;
    }

    // 미선택 시 랜덤
    const finalP1 = p1Choice || generateBotChoice();
    const finalP2 = p2Choice || generateBotChoice();

    const result = resolveRPS(p1Choice, p2Choice);

    if (result === "player1") {
      winners.push(match.player1Id);
      if (match.player2Id !== "BOT") losers.push(match.player2Id);
    } else if (result === "player2") {
      if (match.player2Id !== "BOT") {
        winners.push(match.player2Id);
      }
      losers.push(match.player1Id);
    } else {
      // 무승부 – 둘 다 진출
      winners.push(match.player1Id);
      if (match.player2Id !== "BOT") winners.push(match.player2Id);
    }

    matchResults[match.matchId] = {
      player1Choice: finalP1,
      player2Choice: finalP2,
      winnerId: result === "draw" ? "draw" : result === "player1" ? match.player1Id : match.player2Id,
      result,
    };
  }

  // 4. Realtime DB 업데이트
  const rtUpdates: Record<string, unknown> = {
    [`games/${roomId}/current/phase`]: "round_result",
    [`games/${roomId}/current/aliveCount`]: winners.length,
    [`games/${roomId}/current/matchResults`]: matchResults,
  };

  for (const lid of losers) {
    rtUpdates[`games/${roomId}/participants/${lid}/alive`] = false;
    rtUpdates[`games/${roomId}/participants/${lid}/eliminatedRound`] = roundNumber;
  }

  await rtdb.ref().update(rtUpdates);

  // 5. Firestore 라운드 완료
  await sessionRef.update({
    [`rounds.${roundNumber}.status`]: "completed",
    [`rounds.${roundNumber}.completedAt`]: Date.now(),
  });

  // 6. 다음 단계 결정
  if (winners.length <= 1) {
    // 게임 종료 – 우승자 결정
    const winnerId = winners[0] || null;
    await sessionRef.update({
      phase: "completed",
      winnerId,
      completedAt: Date.now(),
    });
    await rtdb.ref(`games/${roomId}/current`).update({
      phase: "final_result",
      winnerId,
    });

    return { status: "completed", winnerId };
  }

  // 7. 다음 라운드 준비 (5초 후)
  return {
    status: "next_round",
    nextRound: roundNumber + 1,
    aliveCount: winners.length,
    winners,
  };
});
