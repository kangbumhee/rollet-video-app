import { onValueWritten } from 'firebase-functions/v2/database';
import { getDatabase } from 'firebase-admin/database';
import { logger } from 'firebase-functions';

// 무한 트리거 방지를 위한 디바운스: advanceToNextRound에서 RTDB를 쓸 때
// roundActions를 다시 쓰므로, 이 트리거가 재호출될 수 있다.
// current/phase를 'advancing'으로 먼저 세팅하여 중복 진입을 막는다.

export const onRoundActionSubmit = onValueWritten(
  {
    ref: 'games/{roomId}/roundActions/{roundKey}/{uid}',
    region: 'asia-northeast3',
  },
  async (event) => {
    const rtdb = getDatabase();
    const { roomId, roundKey } = event.params;

    try {
      const [currentSnap, actionsSnap, participantsSnap, presenceSnap] = await Promise.all([
        rtdb.ref(`games/${roomId}/current`).get(),
        rtdb.ref(`games/${roomId}/roundActions/${roundKey}`).get(),
        rtdb.ref(`games/${roomId}/participants`).get(),
        rtdb.ref(`games/${roomId}/presence`).get(),
      ]);

      if (!currentSnap.exists() || !participantsSnap.exists()) return;

      const current = currentSnap.val();
      const actions = actionsSnap.val() || {};
      const participants = participantsSnap.val();
      const presence = presenceSnap.val() || {};

      // 중복 진입 방지: playing 상태에서만 처리
      if (current.phase !== 'playing') return;
      if (`round${current.round}` !== roundKey) return;

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
      await rtdb.ref(`games/${roomId}/current/roundProgress`).set({
        total: activePlayerIds.length,
        done: doneCount,
        online: onlineActiveCount,
        onlineDone: onlineDoneCount,
        updatedAt: Date.now(),
      });

      const allDone = doneCount >= activePlayerIds.length;
      const allOnlineDone = onlineActiveCount > 0 && onlineDoneCount >= onlineActiveCount;

      if (allDone || allOnlineDone) {
        // 중복 실행 방지: phase를 먼저 'advancing'으로 변경
        const phaseRef = rtdb.ref(`games/${roomId}/current/phase`);
        const txResult = await phaseRef.transaction((currentPhase) => {
          if (currentPhase === 'playing') return 'advancing';
          return undefined; // 이미 다른 상태면 transaction 취소
        });

        if (!txResult.committed) {
          logger.info('Another instance already advancing, skipping');
          return;
        }

        logger.info(`Round ${roundKey} complete: ${doneCount}/${activePlayerIds.length}, advancing`);
        await advanceToNextRound(rtdb, roomId, current, actions, activePlayerIds, participants);
      }
    } catch (error) {
      logger.error('onRoundActionSubmit error:', error);
    }
  }
);

async function advanceToNextRound(
  rtdb: ReturnType<typeof getDatabase>,
  roomId: string,
  current: Record<string, unknown>,
  roundActions: Record<string, Record<string, unknown>>,
  activePlayerIds: string[],
  participants: Record<string, { alive?: boolean }>,
) {
  const currentRound = (current.round as number) ?? 0;
  const totalRounds = (current.totalRounds as number) ?? 10;

  // 점수 집계
  const updates: Record<string, unknown> = {};
  const prevScores = (current.scores as Record<string, number>) || {};
  for (const uid of activePlayerIds) {
    const action = roundActions[uid];
    const roundScore = action?.done ? (action.score as number) || 0 : 0;
    const prevScore = prevScores[uid] || 0;
    updates[`games/${roomId}/current/scores/${uid}`] = prevScore + roundScore;
  }

  // 라운드 결과 표시
  updates[`games/${roomId}/current/phase`] = 'round_result';
  updates[`games/${roomId}/current/roundResultAt`] = Date.now();
  await rtdb.ref().update(updates);

  // 2.5초 대기 (라운드 결과 애니메이션 시간)
  await new Promise((r) => setTimeout(r, 2500));

  // 마지막 라운드면 최종 결과
  if (currentRound >= totalRounds) {
    const finalScoresSnap = await rtdb.ref(`games/${roomId}/current/scores`).get();
    const finalScores = finalScoresSnap.val() || {};
    const sorted = Object.entries(finalScores as Record<string, number>).sort((a, b) => b[1] - a[1]);
    const winnerId = sorted[0]?.[0] || null;
    const nameMap = (current.nameMap as Record<string, string>) || {};

    await rtdb.ref(`games/${roomId}/current`).update({
      phase: 'final_result',
      winnerId,
      winnerName: winnerId ? (nameMap[winnerId] || winnerId) : null,
      finalScores,
      completedAt: Date.now(),
    });
    return;
  }

  // 다음 라운드 세팅
  const nextRound = currentRound + 1;
  const roundDataSnap = await rtdb.ref(`games/${roomId}/rounds/round${nextRound}`).get();
  const roundData = roundDataSnap.val() as { timeLimit?: number } | null;
  const timeLimit = roundData?.timeLimit ?? 15;

  const nextActions: Record<string, Record<string, unknown>> = {};
  for (const uid of activePlayerIds) {
    if (participants[uid]?.alive !== false) {
      nextActions[uid] = { done: false, score: 0 };
    }
  }

  const now = Date.now();
  await rtdb.ref().update({
    [`games/${roomId}/current/phase`]: 'playing',
    [`games/${roomId}/current/round`]: nextRound,
    [`games/${roomId}/current/roundStartedAt`]: now,
    [`games/${roomId}/current/roundEndsAt`]: now + timeLimit * 1000,
    [`games/${roomId}/current/roundProgress`]: null,
    [`games/${roomId}/roundActions/round${nextRound}`]: nextActions,
  });
}
