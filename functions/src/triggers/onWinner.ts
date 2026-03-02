// functions/src/triggers/onWinner.ts
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { logger } from 'firebase-functions';

export const onWinnerDetermined = onDocumentUpdated(
  {
    document: 'gameSessions/{sessionId}',
    region: 'asia-northeast3',
  },
  async (event) => {
    const before = event.data?.before.data() as { winnerId?: string } | undefined;
    const after = event.data?.after.data() as { winnerId?: string; roomId?: string } | undefined;
    if (!before || !after) return;
    if (before.winnerId || !after.winnerId) return;

    const winnerId = after.winnerId;
    const roomId = after.roomId;
    if (!roomId) return;

    const db = getFirestore();
    const rtdb = getDatabase();

    logger.info(`Winner determined: ${winnerId} in room ${roomId}`);

    try {
      const roomDoc = await db.doc(`prizeRooms/${roomId}`).get();
      const room = roomDoc.data() as { prizeTitle?: string } | undefined;
      const winnerDoc = await db.doc(`users/${winnerId}`).get();
      const winner = winnerDoc.data() as { displayName?: string; totalExp?: number; points?: number } | undefined;
      if (!room || !winner) return;

      const winnerName = winner.displayName || '알 수 없음';

      await db.doc(`prizeRooms/${roomId}`).update({
        winnerId,
        winnerName,
        status: 'COMPLETED',
        updatedAt: Date.now(),
      });

      await db.doc(`users/${winnerId}`).update({
        totalExp: (winner.totalExp || 0) + 100,
        points: (winner.points || 0) + 500,
      });

      await rtdb.ref('cycle/main').update({
        winnerId,
        winnerName,
      });
    } catch (error) {
      logger.error('onWinner error:', error);
    }
  }
);
