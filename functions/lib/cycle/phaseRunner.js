"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPhase = void 0;
// functions/src/cycle/phaseRunner.ts
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("firebase-admin/database");
exports.runPhase = (0, https_1.onCall)({ region: 'asia-northeast3', timeoutSeconds: 300 }, async (request) => {
    const { roomId, phase, sessionId } = request.data;
    if (!roomId || !phase) {
        throw new https_1.HttpsError('invalid-argument', 'roomId and phase are required');
    }
    const db = (0, firestore_1.getFirestore)();
    const rtdb = (0, database_1.getDatabase)();
    switch (phase) {
        case 'PROCESS_ROUND': {
            if (!sessionId) {
                throw new https_1.HttpsError('invalid-argument', 'sessionId required for PROCESS_ROUND');
            }
            const sessionRef = db.doc(`gameSessions/${sessionId}`);
            const sessionSnap = await sessionRef.get();
            if (!sessionSnap.exists) {
                throw new https_1.HttpsError('not-found', 'Session not found');
            }
            await rtdb.ref(`games/${roomId}/current`).update({ phase: 'round_result' });
            return { status: 'processed' };
        }
        case 'NEXT_ROUND': {
            if (!sessionId) {
                throw new https_1.HttpsError('invalid-argument', 'sessionId required');
            }
            await rtdb.ref(`games/${roomId}/current`).update({ phase: 'playing' });
            return { status: 'round_created' };
        }
        default:
            throw new https_1.HttpsError('invalid-argument', `Unknown phase: ${phase}`);
    }
});
//# sourceMappingURL=phaseRunner.js.map