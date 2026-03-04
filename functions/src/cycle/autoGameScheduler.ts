// functions/src/cycle/autoGameScheduler.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

const GAME_LIST = [
  { id: 'drawGuess', name: '🎨 그림 맞추기' },
  { id: 'bigRoulette', name: '🎰 빅 룰렛' },
  { id: 'typingBattle', name: '⌨️ 타이핑 배틀' },
  { id: 'weaponForge', name: '⚔️ 무기 강화 대전' },
  { id: 'priceGuess', name: '💰 가격 맞추기' },
  { id: 'oxSurvival', name: '⭕ OX 서바이벌' },
  { id: 'destinyAuction', name: '🎰 운명의 경매' },
  { id: 'nunchiGame', name: '👀 눈치 게임' },
  { id: 'quickTouch', name: '🎯 순발력 터치' },
  { id: 'lineRunner', name: '✏️ 라인 러너' },
];

function getNextHalfHour(): number {
  const now = new Date();
  const ms = now.getTime();
  const min = now.getMinutes();
  const sec = now.getSeconds();
  const msec = now.getMilliseconds();
  let nextMin: number;
  if (min < 30) nextMin = 30;
  else nextMin = 60;
  let diffMs = (nextMin - min) * 60 * 1000 - sec * 1000 - msec;
  if (diffMs < 5 * 60 * 1000) diffMs += 30 * 60 * 1000;
  return ms + diffMs;
}

export const autoGameScheduler = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'asia-northeast3',
    timeZone: 'Asia/Seoul',
    retryCount: 0,
    timeoutSeconds: 60,
  },
  async () => {
    const rtdb = getDatabase();
    const db = getFirestore();
    const roomId = 'main';
    const now = Date.now();

    logger.info('Auto game scheduler started');

    try {
      // 1) 경품 게임이 진행 중이면 스킵
      const cycleSnap = await rtdb.ref('cycle/main/currentPhase').get();
      const currentPhase = cycleSnap.exists() ? cycleSnap.val() : 'IDLE';
      if (currentPhase !== 'IDLE' && currentPhase !== 'COOLDOWN') {
        logger.info('Prize game in progress, skipping auto game');
        await rtdb.ref(`rooms/${roomId}/autoGame`).remove();
        return;
      }

      // 2) 이미 일반 게임이 진행 중이면 스킵
      const gameSnap = await rtdb.ref(`games/${roomId}/current/phase`).get();
      const gamePhase = gameSnap.exists() ? gameSnap.val() : null;
      if (gamePhase && gamePhase !== 'idle' && gamePhase !== 'final_result') {
        logger.info('A game is already running, skipping');
        return;
      }

      // 3) 경품 게임이 10분 이내에 예정되어 있으면 스킵
      const prizeSnap = await db
        .collection('scheduleSlots')
        .where('status', '==', 'ASSIGNED')
        .where('scheduledAt', '>', now)
        .where('scheduledAt', '<', now + 10 * 60 * 1000)
        .orderBy('scheduledAt', 'asc')
        .limit(1)
        .get();
      if (!prizeSnap.empty) {
        logger.info('Prize game scheduled within 10 min, skipping auto game');
        await rtdb.ref(`rooms/${roomId}/autoGame`).remove();
        return;
      }

      // 4) autoGame 현재 상태 확인
      const autoSnap = await rtdb.ref(`rooms/${roomId}/autoGame`).get();
      const autoData = autoSnap.exists() ? autoSnap.val() as Record<string, unknown> : null;

      if (!autoData || !autoData.phase) {
        // 자동 게임이 없으면 새로 스케줄
        const nextGameAt = getNextHalfHour();
        const nextGame = GAME_LIST[Math.floor(Math.random() * GAME_LIST.length)];
        await rtdb.ref(`rooms/${roomId}/autoGame`).set({
          phase: 'waiting',
          nextGameAt,
          nextGameType: nextGame.id,
          nextGameName: nextGame.name,
          reward: { type: 'point', amount: 100, label: '100 포인트' },
        });
        logger.info(`Scheduled next auto game: ${nextGame.name} at ${new Date(nextGameAt).toISOString()}`);
        return;
      }

      // 5) waiting 상태인데 nextGameAt이 지났으면 → recruit 시작
      if (autoData.phase === 'waiting') {
        const nextGameAt = autoData.nextGameAt as number;
        if (nextGameAt && nextGameAt <= now) {
          logger.info('Auto game time reached, starting recruit phase');
          await rtdb.ref(`rooms/${roomId}/autoGame`).update({
            phase: 'recruiting',
            recruitingUntil: now + 30000,
            joinedPlayers: {},
          });
        }
        return;
      }

      // 6) recruiting 상태인데 recruitingUntil이 지났으면 → start API 호출 또는 리스케줄
      if (autoData.phase === 'recruiting') {
        const recruitingUntil = autoData.recruitingUntil as number;
        if (recruitingUntil && recruitingUntil <= now) {
          const joinedPlayers = (autoData.joinedPlayers as Record<string, unknown>) || {};
          const playerCount = Object.keys(joinedPlayers).length;

          if (playerCount < 2) {
            logger.info(`Not enough players (${playerCount}), rescheduling`);
            const nextGameAt = getNextHalfHour();
            const nextGame = GAME_LIST[Math.floor(Math.random() * GAME_LIST.length)];
            await rtdb.ref(`rooms/${roomId}/autoGame`).set({
              phase: 'waiting',
              nextGameAt,
              nextGameType: nextGame.id,
              nextGameName: nextGame.name,
              reward: { type: 'point', amount: 100, label: '100 포인트' },
            });
          } else {
            // start API 호출
            logger.info(`${playerCount} players joined, calling start API`);
            const AUTO_GAME_SECRET = process.env.AUTO_GAME_SECRET || 'auto-game-secret-key';
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prizelive.vercel.app';
            try {
              const res = await fetch(`${appUrl}/api/room/${roomId}/auto-game`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'start', secret: AUTO_GAME_SECRET }),
              });
              const data = await res.json();
              logger.info('Start API response:', data);
            } catch (e) {
              logger.error('Failed to call start API:', e);
              // 실패 시 리스케줄
              const nextGameAt = getNextHalfHour();
              const nextGame = GAME_LIST[Math.floor(Math.random() * GAME_LIST.length)];
              await rtdb.ref(`rooms/${roomId}/autoGame`).set({
                phase: 'waiting',
                nextGameAt,
                nextGameType: nextGame.id,
                nextGameName: nextGame.name,
                reward: { type: 'point', amount: 100, label: '100 포인트' },
              });
            }
          }
        }
        return;
      }

      // 7) starting 또는 기타 상태인데 오래됐으면 리셋
      if (autoData.phase === 'starting') {
        logger.info('Auto game stuck in starting, resetting');
        const nextGameAt = getNextHalfHour();
        const nextGame = GAME_LIST[Math.floor(Math.random() * GAME_LIST.length)];
        await rtdb.ref(`rooms/${roomId}/autoGame`).set({
          phase: 'waiting',
          nextGameAt,
          nextGameType: nextGame.id,
          nextGameName: nextGame.name,
          reward: { type: 'point', amount: 100, label: '100 포인트' },
        });
      }

    } catch (error) {
      logger.error('Auto game scheduler error:', error);
    }
  }
);
