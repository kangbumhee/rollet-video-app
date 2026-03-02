"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onWinnerDetermined = void 0;
// functions/src/triggers/onWinner.ts
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const database_1 = require("firebase-admin/database");
const firebase_functions_1 = require("firebase-functions");
exports.onWinnerDetermined = (0, firestore_1.onDocumentUpdated)({
    document: 'gameSessions/{sessionId}',
    region: 'asia-northeast3',
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    if (before.winnerId || !after.winnerId)
        return;
    const winnerId = after.winnerId;
    const roomId = after.roomId;
    if (!roomId)
        return;
    const db = (0, firestore_2.getFirestore)();
    const rtdb = (0, database_1.getDatabase)();
    firebase_functions_1.logger.info(`Winner determined: ${winnerId} in room ${roomId}`);
    try {
        const roomDoc = await db.doc(`prizeRooms/${roomId}`).get();
        const room = roomDoc.data();
        const winnerDoc = await db.doc(`users/${winnerId}`).get();
        const winner = winnerDoc.data();
        if (!room || !winner)
            return;
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
    }
    catch (error) {
        firebase_functions_1.logger.error('onWinner error:', error);
    }
});
//# sourceMappingURL=onWinner.js.map