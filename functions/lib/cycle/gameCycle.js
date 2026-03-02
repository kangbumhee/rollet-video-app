"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameCycle = void 0;
// functions/src/cycle/gameCycle.ts
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("firebase-admin/database");
const firebase_functions_1 = require("firebase-functions");
const PHASES = [
    { phase: 'ANNOUNCING', duration: 120 },
    { phase: 'ENTRY_GATE', duration: 180 },
    { phase: 'GAME_LOBBY', duration: 60 },
    { phase: 'GAME_COUNTDOWN', duration: 5 },
    { phase: 'GAME_PLAYING', duration: 600 },
    { phase: 'GAME_RESULT', duration: 30 },
    { phase: 'WINNER_ANNOUNCE', duration: 60 },
    { phase: 'COOLDOWN', duration: 745 },
];
function calcNextSlot(nowMs) {
    const kst = new Date(nowMs + 9 * 60 * 60 * 1000);
    const y = kst.getFullYear();
    const mo = String(kst.getMonth() + 1).padStart(2, '0');
    const d = String(kst.getDate()).padStart(2, '0');
    const h = kst.getHours();
    const m = kst.getMinutes();
    let slotH = h;
    let slotM;
    if (m < 30) {
        slotM = 30;
    }
    else {
        slotM = 0;
        slotH = h + 1;
    }
    if (slotH >= 24)
        slotH = 0;
    return `${y}-${mo}-${d}T${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
}
exports.gameCycle = (0, scheduler_1.onSchedule)({
    schedule: 'every 30 minutes',
    region: 'asia-northeast3',
    timeZone: 'Asia/Seoul',
    retryCount: 1,
    timeoutSeconds: 540,
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const rtdb = (0, database_1.getDatabase)();
    const now = Date.now();
    firebase_functions_1.logger.info('Game cycle started', { timestamp: new Date().toISOString() });
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
        const slotData = slotDoc.data();
        const roomId = slotData.roomId;
        if (!roomId) {
            await slotDoc.ref.update({ status: 'DISABLED', enabled: false, updatedAt: now });
            return;
        }
        await slotDoc.ref.update({ status: 'LIVE', updatedAt: now });
        const roomDoc = await db.doc(`prizeRooms/${roomId}`).get();
        if (!roomDoc.exists) {
            await slotDoc.ref.update({ status: 'DISABLED', enabled: false, updatedAt: now });
            return;
        }
        const room = roomDoc.data();
        await db.doc(`prizeRooms/${roomId}`).update({ status: 'LIVE', updatedAt: now });
        let phaseStartTime = now;
        for (const phaseConfig of PHASES) {
            const phaseEndTime = phaseStartTime + phaseConfig.duration * 1000;
            await rtdb.ref('cycle/main').update({
                currentPhase: phaseConfig.phase,
                currentRoomId: roomId,
                currentPrizeTitle: room.prizeTitle || null,
                currentPrizeImage: room.prizeImageURL || null,
                currentGameType: room.gameType || null,
                entryType: room.entryType || 'AD',
                videoURL: room.videoURL || null,
                phaseStartedAt: phaseStartTime,
                phaseEndsAt: phaseEndTime,
                nextSlot: calcNextSlot(now + 30 * 60 * 1000),
            });
            if (phaseConfig.phase === 'ANNOUNCING') {
                await sendBotChat(rtdb, roomId, `🎁 이번 경품은 "${room.prizeTitle || ''}"입니다! 예상 가치: ${Number(room.estimatedValue || 0).toLocaleString()}원!`);
            }
            if (phaseConfig.phase === 'ENTRY_GATE') {
                const entryMsg = room.entryType === 'VIDEO' ? '📹 제품 영상을 시청하고 참가 티켓을 받으세요!' : '📺 광고를 시청하고 참가 티켓을 받으세요!';
                await sendBotChat(rtdb, roomId, entryMsg);
            }
            if (phaseConfig.phase === 'GAME_PLAYING') {
                break;
            }
            if (phaseConfig.duration <= 180) {
                await sleep(phaseConfig.duration * 1000);
            }
            else {
                break;
            }
            phaseStartTime = phaseEndTime;
        }
        await db.collection('cycleLogs').add({
            roomId,
            slot: calcNextSlot(now - 1000),
            startedAt: now,
            prizeTitle: room.prizeTitle || '',
            gameType: room.gameType || 'rps',
            completedAt: Date.now(),
        });
        await slotDoc.ref.update({ status: 'COMPLETED', updatedAt: Date.now() });
    }
    catch (error) {
        firebase_functions_1.logger.error('Game cycle error:', error);
        throw error;
    }
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function sendBotChat(rtdb, roomId, message) {
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
//# sourceMappingURL=gameCycle.js.map