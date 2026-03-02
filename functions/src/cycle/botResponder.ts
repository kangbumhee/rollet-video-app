// functions/src/cycle/botResponder.ts
import { onValueWritten } from 'firebase-functions/v2/database';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getDatabase } from 'firebase-admin/database';
import { logger } from 'firebase-functions';

export const onChatMessage = onValueWritten(
  {
    ref: 'rooms/{roomId}/chat/{messageId}',
    region: 'us-central1',
  },
  async (event) => {
    const roomId = event.params.roomId;
    const message = event.data.after.val() as { uid?: string; message?: string } | null;

    if (!message || message.uid === 'BOT_HOST') return;

    const text = (message.message || '').toLowerCase().trim();
    const rtdb = getDatabase();

    const responses: Array<{ keywords: string[]; reply: string }> = [
      { keywords: ['안녕', '하이', 'hello', 'hi'], reply: '안녕하세요! 🎉 경품 게임에 오신 것을 환영합니다!' },
      { keywords: ['경품', '뭐야', '뭐예요', '상품'], reply: '💡 현재 진행 중인 경품은 상단에서 확인할 수 있어요!' },
      { keywords: ['참가', '참여', '방법'], reply: '🎫 광고 또는 영상을 시청하면 참가 티켓을 받을 수 있어요!' },
    ];

    for (const r of responses) {
      if (r.keywords.some((kw) => text.includes(kw))) {
        if (Math.random() < 0.3) {
          await sendBotReply(rtdb, roomId, r.reply);
        }
        break;
      }
    }
  }
);

export const periodicHype = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'asia-northeast3',
    timeZone: 'Asia/Seoul',
  },
  async () => {
    const rtdb = getDatabase();
    const cycleSnap = await rtdb.ref('cycle/main').get();
    const cycle = cycleSnap.val() as { currentPhase?: string } | null;
    if (!cycle || cycle.currentPhase === 'IDLE') return;

    const presenceSnap = await rtdb.ref('rooms/main/presence').get();
    const onlineCount = presenceSnap.numChildren();
    if (onlineCount < 2) return;

    const hypeMessages = [
      `🔥 현재 ${onlineCount}명이 시청 중! 열기가 뜨겁습니다!`,
      `👀 ${onlineCount}명이 함께하고 있어요!`,
      '💪 포기하지 마세요! 다음 기회가 곧 옵니다!',
    ];

    const randomMsg = hypeMessages[Math.floor(Math.random() * hypeMessages.length)];
    await sendBotReply(rtdb, 'main', randomMsg);
    logger.info(`Hype message sent to main room. Online: ${onlineCount}`);
  }
);

async function sendBotReply(rtdb: ReturnType<typeof getDatabase>, roomId: string, message: string): Promise<void> {
  const chatRef = rtdb.ref(`rooms/${roomId}/chat`).push();
  await chatRef.set({
    uid: 'BOT_HOST',
    displayName: '🎪 방장봇',
    message,
    level: 99,
    timestamp: Date.now(),
    type: 'bot',
  });
}
