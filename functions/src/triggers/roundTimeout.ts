import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getDatabase } from 'firebase-admin/database';
import { logger } from 'firebase-functions';

// 1분마다 모든 활성 게임의 라운드 타임아웃을 체크.
// 서버 측 타임아웃이므로 최대 1분+5초 지연이 있을 수 있지만,
// 클라이언트 측에서도 timeLeft <= 0일 때 자동 제출하므로 이중 안전장치.

export const roundTimeoutCheck = onSchedule(
  {
    schedule: 'every 1 minutes',
    region: 'asia-northeast3',
    timeZone: 'Asia/Seoul',
  },
  async () => {
    const rtdb = getDatabase();

    // main 방과 활성 커스텀방 모두 체크
    const roomIds = ['main'];
    // 추후 커스텀방도 체크하려면 여기에 추가

    for (const roomId of roomIds) {
      try {
        const currentSnap = await rtdb.ref(`games/${roomId}/current`).get();
        if (!currentSnap.exists()) continue;
        const current = currentSnap.val();
        if (current.phase !== 'playing') continue;

        const now = Date.now();
        // 타임아웃 + 5초 여유
        if (now < (current.roundEndsAt || 0) + 5000) continue;

        logger.info(`[${roomId}] Round ${current.round} timed out, forcing advance`);

        const roundKey = `round${current.round}`;
        const [actionsSnap, participantsSnap] = await Promise.all([
          rtdb.ref(`games/${roomId}/roundActions/${roundKey}`).get(),
          rtdb.ref(`games/${roomId}/participants`).get(),
        ]);
        const actions = actionsSnap.val() || {};
        const participants = participantsSnap.val() || {};

        const updates: Record<string, unknown> = {};
        for (const uid of Object.keys(participants)) {
          if (participants[uid]?.alive !== false && !actions[uid]?.done) {
            updates[`games/${roomId}/roundActions/${roundKey}/${uid}`] = {
              done: true,
              score: 0,
              submittedAt: now,
              timedOut: true,
            };
          }
        }

        if (Object.keys(updates).length > 0) {
          await rtdb.ref().update(updates);
          // 이 write가 onRoundActionSubmit을 트리거하여 자동으로 다음 라운드로 진행
        }
      } catch (error) {
        logger.error(`roundTimeoutCheck error for ${roomId}:`, error);
      }
    }
  }
);
