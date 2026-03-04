import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminRealtimeDb } from "@/lib/firebase/admin";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params;

    // 인증 확인
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(token);

    // 현재 게임 상태 조회
    const [currentSnap, participantsSnap] = await Promise.all([
      adminRealtimeDb.ref(`games/${roomId}/current`).get(),
      adminRealtimeDb.ref(`games/${roomId}/participants`).get(),
    ]);

    if (!currentSnap.exists() || !participantsSnap.exists()) {
      return NextResponse.json({ error: "게임 없음" }, { status: 404 });
    }

    const current = currentSnap.val();
    const participants = participantsSnap.val();

    // playing 상태에서만 처리
    if (current.phase !== 'playing') {
      return NextResponse.json({ status: "not_playing", phase: current.phase });
    }

    const roundKey = `round${current.round}`;
    const [actionsSnap, presenceSnap] = await Promise.all([
      adminRealtimeDb.ref(`games/${roomId}/roundActions/${roundKey}`).get(),
      adminRealtimeDb.ref(`games/${roomId}/presence`).get(),
    ]);

    const actions = actionsSnap.val() || {};
    const presence = presenceSnap.val() || {};

    // 활성 플레이어 추출
    const activePlayerIds: string[] = [];
    for (const uid of Object.keys(participants)) {
      if (participants[uid]?.alive !== false) {
        activePlayerIds.push(uid);
      }
    }

    let doneCount = 0;
    let onlineDoneCount = 0;
    const onlineActiveCount = activePlayerIds.filter(
      (uid) => presence[uid]?.online === true
    ).length;

    for (const uid of activePlayerIds) {
      if (actions[uid]?.done === true) {
        doneCount++;
        if (presence[uid]?.online === true) {
          onlineDoneCount++;
        }
      }
    }

    // 진행률 업데이트
    await adminRealtimeDb.ref(`games/${roomId}/current/roundProgress`).set({
      total: activePlayerIds.length,
      done: doneCount,
      online: onlineActiveCount,
      onlineDone: onlineDoneCount,
      updatedAt: Date.now(),
    });

    // 시간 초과 체크: roundEndsAt + 3초 지났으면 미제출자 강제 처리
    const now = Date.now();
    const roundTimedOut = current.roundEndsAt && (now > current.roundEndsAt + 3000);

    if (roundTimedOut) {
      // 미제출 유저 강제 제출
      const forceUpdates: Record<string, unknown> = {};
      for (const uid of activePlayerIds) {
        if (!actions[uid]?.done) {
          forceUpdates[`games/${roomId}/roundActions/${roundKey}/${uid}`] = {
            done: true,
            score: 0,
            submittedAt: now,
            timedOut: true,
          };
          doneCount++;
        }
      }
      if (Object.keys(forceUpdates).length > 0) {
        await adminRealtimeDb.ref().update(forceUpdates);
      }
    }

    const allDone = doneCount >= activePlayerIds.length;
    const allOnlineDone = onlineActiveCount > 0 && onlineDoneCount >= onlineActiveCount;

    if (!allDone && !allOnlineDone && !roundTimedOut) {
      return NextResponse.json({
        status: "waiting",
        done: doneCount,
        total: activePlayerIds.length,
        online: onlineActiveCount,
        onlineDone: onlineDoneCount,
      });
    }

    // ── 라운드 진행: phase를 advancing으로 전환 (중복 방지) ──
    const freshPhaseSnap = await adminRealtimeDb.ref(`games/${roomId}/current/phase`).get();
    const freshPhase = freshPhaseSnap.val();
    if (freshPhase !== 'playing') {
      return NextResponse.json({ status: "already_advancing", phase: freshPhase });
    }

    await adminRealtimeDb.ref(`games/${roomId}/current/phase`).set('advancing');

    // 최신 actions 다시 읽기
    const freshActionsSnap = await adminRealtimeDb.ref(`games/${roomId}/roundActions/${roundKey}`).get();
    const freshActions = freshActionsSnap.val() || {};

    // 점수 집계
    const updates: Record<string, unknown> = {};
    const prevScores = (current.scores as Record<string, number>) || {};
    for (const uid of activePlayerIds) {
      const action = freshActions[uid];
      const roundScore = action?.done ? (action.score as number) || 0 : 0;
      const prevScore = prevScores[uid] || 0;
      updates[`games/${roomId}/current/scores/${uid}`] = prevScore + roundScore;
    }

    // 라운드 결과 표시
    updates[`games/${roomId}/current/phase`] = 'round_result';
    updates[`games/${roomId}/current/roundResultAt`] = Date.now();
    await adminRealtimeDb.ref().update(updates);

    // 2.5초 후 다음 라운드 세팅 (서버 측에서 대기)
    await new Promise((r) => setTimeout(r, 2500));

    const currentRound = (current.round as number) ?? 0;
    const totalRounds = (current.totalRounds as number) ?? 10;

    // 마지막 라운드면 최종 결과
    if (currentRound >= totalRounds) {
      const finalScoresSnap = await adminRealtimeDb.ref(`games/${roomId}/current/scores`).get();
      const finalScores = finalScoresSnap.val() || {};
      const sorted = Object.entries(finalScores as Record<string, number>).sort((a, b) => b[1] - a[1]);
      const winnerId = sorted[0]?.[0] || null;
      const nameMap = (current.nameMap as Record<string, string>) || {};

      await adminRealtimeDb.ref(`games/${roomId}/current`).update({
        phase: 'final_result',
        winnerId,
        winnerName: winnerId ? (nameMap[winnerId] || winnerId) : null,
        finalScores,
        completedAt: Date.now(),
      });

      return NextResponse.json({ status: "game_complete", winnerId });
    }

    // 다음 라운드 세팅
    const nextRound = currentRound + 1;
    const roundDataSnap = await adminRealtimeDb.ref(`games/${roomId}/rounds/round${nextRound}`).get();
    const roundData = roundDataSnap.val() as { timeLimit?: number } | null;
    const timeLimit = roundData?.timeLimit ?? 15;

    const nextActions: Record<string, Record<string, unknown>> = {};
    for (const uid of activePlayerIds) {
      if (participants[uid]?.alive !== false) {
        nextActions[uid] = { done: false, score: 0 };
      }
    }

    const nextNow = Date.now();
    await adminRealtimeDb.ref().update({
      [`games/${roomId}/current/phase`]: 'playing',
      [`games/${roomId}/current/round`]: nextRound,
      [`games/${roomId}/current/roundStartedAt`]: nextNow,
      [`games/${roomId}/current/roundEndsAt`]: nextNow + timeLimit * 1000,
      [`games/${roomId}/current/roundProgress`]: null,
      [`games/${roomId}/roundActions/round${nextRound}`]: nextActions,
    });

    return NextResponse.json({ status: "advanced", round: nextRound });
  } catch (error) {
    console.error("advance-round error:", error);
    return NextResponse.json({ error: "라운드 진행 실패" }, { status: 500 });
  }
}
