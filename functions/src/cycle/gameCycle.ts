// functions/src/cycle/gameCycle.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { logger } from 'firebase-functions';

const PHASES = [
  { phase: 'ANNOUNCING', duration: 120 },
  { phase: 'ENTRY_GATE', duration: 180 },
  { phase: 'GAME_LOBBY', duration: 60 },
  { phase: 'GAME_COUNTDOWN', duration: 5 },
  { phase: 'GAME_PLAYING', duration: 600 },
  { phase: 'GAME_RESULT', duration: 30 },
  { phase: 'WINNER_ANNOUNCE', duration: 60 },
  { phase: 'COOLDOWN', duration: 745 },
] as const;

function calcNextSlot(nowMs: number): string {
  const kst = new Date(nowMs + 9 * 60 * 60 * 1000);
  const y = kst.getFullYear();
  const mo = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  const h = kst.getHours();
  const m = kst.getMinutes();

  let slotH = h;
  let slotM: number;
  if (m < 30) {
    slotM = 30;
  } else {
    slotM = 0;
    slotH = h + 1;
  }

  if (slotH >= 24) slotH = 0;
  return `${y}-${mo}-${d}T${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
}

export const gameCycle = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'asia-northeast3',
    timeZone: 'Asia/Seoul',
    retryCount: 1,
    timeoutSeconds: 540,
  },
  async () => {
    const db = getFirestore();
    const rtdb = getDatabase();
    const now = Date.now();

    logger.info('Game cycle started', { timestamp: new Date().toISOString() });

    try {
      const slotQuery = await db
        .collection('scheduleSlots')
        .where('enabled', '==', true)
        .where('status', '==', 'ASSIGNED')
        .where('scheduledAt', '<=', now + 60000)
        .orderBy('scheduledAt', 'asc')
        .limit(1)
        .get();

      if (slotQuery.empty) {
        const nextSlot = calcNextSlot(now);
        await rtdb.ref('cycle/main').set({
          currentPhase: 'IDLE',
          currentRoomId: null,
          currentPrizeTitle: null,
          currentPrizeImage: null,
          currentGameType: null,
          entryType: null,
          videoURL: null,
          phaseStartedAt: now,
          phaseEndsAt: now,
          nextSlot,
          cycleIndex: 0,
          winnerId: null,
          winnerName: null,
        });
        return;
      }

      const slotDoc = slotQuery.docs[0];
      const slotData = slotDoc.data() as { roomId?: string };
      const roomId = slotData.roomId;
      if (!roomId) {
        await slotDoc.ref.update({ status: 'DISABLED', enabled: false, updatedAt: now });
        return;
      }

      await slotDoc.ref.update({ status: 'LIVE', updatedAt: now });
      const roomDoc = await db.doc(`rooms/${roomId}`).get();
      if (!roomDoc.exists) {
        await slotDoc.ref.update({ status: 'DISABLED', enabled: false, updatedAt: now });
        return;
      }
      const room = roomDoc.data() as Record<string, unknown>;
      await db.doc(`rooms/${roomId}`).update({ status: 'LIVE', updatedAt: now });

      const prizeTitle = (room as any).prize?.title || (room as any).prizeTitle || '';
      const prizeImageURL = (room as any).prize?.imageURL || (room as any).prizeImageURL || '';
      const estimatedValue = (room as any).prize?.estimatedValue || (room as any).estimatedValue || 0;
      const gameType = (room as any).gameType || 'rps';
      const entryType = (room as any).entryType || 'AD';
      const videoURL = (room as any).videoURL || null;

      let phaseStartTime = now;

      for (const phaseConfig of PHASES) {
        const phaseEndTime = phaseStartTime + phaseConfig.duration * 1000;

        await rtdb.ref('cycle/main').update({
          currentPhase: phaseConfig.phase,
          currentRoomId: roomId,
          currentPrizeTitle: prizeTitle,
          currentPrizeImage: prizeImageURL,
          currentGameType: gameType,
          entryType: entryType,
          videoURL: videoURL,
          phaseStartedAt: phaseStartTime,
          phaseEndsAt: phaseEndTime,
          nextSlot: calcNextSlot(now + 30 * 60 * 1000),
        });

        if (phaseConfig.phase === 'ANNOUNCING') {
          await sendBotChat(
            rtdb,
            roomId,
            `🎁 이번 경품은 "${prizeTitle}"입니다! 예상 가치: ${Number(estimatedValue).toLocaleString()}원!`
          );
        }

        if (phaseConfig.phase === 'ENTRY_GATE') {
          const entryMsg = entryType === 'VIDEO' ? '📹 제품 영상을 시청하고 참가 티켓을 받으세요!' : '📺 광고를 시청하고 참가 티켓을 받으세요!';
          await sendBotChat(rtdb, roomId, entryMsg);
        }

        if (phaseConfig.phase === 'GAME_PLAYING') {
          break;
        }

        if (phaseConfig.duration <= 180) {
          await sleep(phaseConfig.duration * 1000);
        } else {
          break;
        }

        phaseStartTime = phaseEndTime;
      }

      await db.collection('cycleLogs').add({
        roomId,
        slot: calcNextSlot(now - 1000),
        startedAt: now,
        prizeTitle: prizeTitle,
        gameType: gameType,
        completedAt: Date.now(),
      });

      await slotDoc.ref.update({ status: 'COMPLETED', updatedAt: Date.now() });
    } catch (error) {
      logger.error('Game cycle error:', error);
      throw error;
    }
  }
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendBotChat(rtdb: ReturnType<typeof getDatabase>, roomId: string, message: string): Promise<void> {
  // 클라이언트가 /chat/{roomId}/messages 를 구독하므로 같은 경로에 작성
  const chatRef = rtdb.ref(`chat/${roomId}/messages`).push();
  await chatRef.set({
    uid: 'BOT_HOST',
    displayName: '🎪 방장봇',
    text: message,        // 'message' → 'text'로 변경 (클라이언트 필드명 일치)
    level: 99,
    timestamp: Date.now(),
    type: 'bot',
  });
}
