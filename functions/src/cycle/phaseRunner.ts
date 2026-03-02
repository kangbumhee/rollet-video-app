// functions/src/cycle/phaseRunner.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';

export const runPhase = onCall({ region: 'asia-northeast3', timeoutSeconds: 300 }, async (request) => {
  const { roomId, phase, sessionId } = request.data as { roomId?: string; phase?: string; sessionId?: string };
  if (!roomId || !phase) {
    throw new HttpsError('invalid-argument', 'roomId and phase are required');
  }

  const db = getFirestore();
  const rtdb = getDatabase();

  switch (phase) {
    case 'PROCESS_ROUND': {
      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId required for PROCESS_ROUND');
      }
      const sessionRef = db.doc(`gameSessions/${sessionId}`);
      const sessionSnap = await sessionRef.get();
      if (!sessionSnap.exists) {
        throw new HttpsError('not-found', 'Session not found');
      }
      await rtdb.ref(`games/${roomId}/current`).update({ phase: 'round_result' });
      return { status: 'processed' };
    }
    case 'NEXT_ROUND': {
      if (!sessionId) {
        throw new HttpsError('invalid-argument', 'sessionId required');
      }
      await rtdb.ref(`games/${roomId}/current`).update({ phase: 'playing' });
      return { status: 'round_created' };
    }
    default:
      throw new HttpsError('invalid-argument', `Unknown phase: ${phase}`);
  }
});
