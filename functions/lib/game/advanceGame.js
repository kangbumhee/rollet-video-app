"use strict";
// functions/src/game/advanceGame.ts
// 게임 진행 자동화 – Cloud Function (Scheduled 또는 Cloud Tasks에서 호출)
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceGame = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("firebase-admin/database");
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
exports.advanceGame = (0, https_1.onCall)({ region: "asia-northeast3" }, async (request) => {
    const { sessionId, roomId, action } = request.data;
    const db = (0, firestore_1.getFirestore)();
    const rtdb = (0, database_1.getDatabase)();
    const sessionRef = db.doc(`gameSessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
        throw new https_1.HttpsError("not-found", "Session not found");
    }
    const session = sessionSnap.data();
    switch (action) {
        case "start_game": {
            // 로비 → 카운트다운 → 첫 라운드
            const participants = session.participants || [];
            if (participants.length < (session.config?.minParticipants || 2)) {
                // 참가자 부족 – 게임 취소
                await sessionRef.update({ phase: "completed", winnerId: null, completedAt: Date.now() });
                await rtdb.ref(`games/${roomId}/current`).update({ phase: "completed" });
                return { status: "cancelled", reason: "insufficient_participants" };
            }
            // 총 라운드 수 계산
            const totalRounds = Math.ceil(Math.log2(participants.length));
            await sessionRef.update({ totalRounds });
            await rtdb.ref(`games/${roomId}/current`).update({
                phase: "countdown",
                totalRounds,
            });
            return { status: "countdown_started", totalRounds, participantCount: participants.length };
        }
        case "create_round": {
            const roundNumber = request.data.roundNumber || 1;
            // 생존자 목록
            const participants = session.participants || [];
            const alivePlayers = participants.filter((p) => !p.eliminated).map((p) => p.uid);
            // 셔플
            const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
            const matchups = [];
            for (let i = 0; i < shuffled.length; i += 2) {
                matchups.push({
                    matchId: generateId(),
                    player1Id: shuffled[i],
                    player2Id: shuffled[i + 1] || "BOT",
                    status: "waiting",
                });
            }
            const round = {
                roundNumber,
                matchups,
                status: "in_progress",
                startedAt: Date.now(),
            };
            // Firestore 업데이트
            await sessionRef.update({
                [`rounds.${roundNumber}`]: round,
                currentRound: roundNumber,
                phase: "playing",
            });
            // Realtime DB 업데이트
            const rtUpdates = {
                [`games/${roomId}/current/currentRound`]: roundNumber,
                [`games/${roomId}/current/phase`]: "playing",
                [`games/${roomId}/current/roundStartedAt`]: Date.now(),
                [`games/${roomId}/current/roundEndsAt`]: Date.now() + 5000,
                [`games/${roomId}/current/countdown`]: 5,
                [`games/${roomId}/current/matchResults`]: null, // 이전 결과 초기화
            };
            for (const match of matchups) {
                rtUpdates[`games/${roomId}/matches/${match.matchId}`] = {
                    player1Id: match.player1Id,
                    player2Id: match.player2Id,
                    status: "waiting",
                };
                rtUpdates[`games/${roomId}/playerMatch/${match.player1Id}`] = {
                    matchId: match.matchId,
                    opponentId: match.player2Id,
                };
                if (match.player2Id !== "BOT") {
                    rtUpdates[`games/${roomId}/playerMatch/${match.player2Id}`] = {
                        matchId: match.matchId,
                        opponentId: match.player1Id,
                    };
                }
            }
            await rtdb.ref().update(rtUpdates);
            return { status: "round_created", roundNumber, matchCount: matchups.length };
        }
        default:
            throw new https_1.HttpsError("invalid-argument", `Unknown action: ${action}`);
    }
});
//# sourceMappingURL=advanceGame.js.map