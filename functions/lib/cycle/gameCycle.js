"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameCycle = void 0;
// functions/src/cycle/gameCycle.ts
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("firebase-admin/database");
const firebase_functions_1 = require("firebase-functions");
const PHASES = [
    { phase: 'ANNOUNCING', duration: 30 },
    { phase: 'ENTRY_GATE', duration: 60 },
    { phase: 'GAME_LOBBY', duration: 30 },
    { phase: 'GAME_COUNTDOWN', duration: 5 },
    { phase: 'GAME_PLAYING', duration: 300 },
    { phase: 'GAME_RESULT', duration: 15 },
    { phase: 'WINNER_ANNOUNCE', duration: 30 },
    { phase: 'COOLDOWN', duration: 30 },
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
async function sendBotChat(rtdb, roomId, message) {
    const chatRef = rtdb.ref(`chat/${roomId}/messages`).push();
    await chatRef.set({
        uid: 'BOT_HOST',
        displayName: '🎪 방장봇',
        text: message,
        level: 99,
        timestamp: Date.now(),
        type: 'bot',
    });
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
            firebase_functions_1.logger.info('No assigned slot found');
            await rtdb.ref('cycle/main').set({
                currentPhase: 'IDLE',
                currentRoomId: null,
                currentPrizeTitle: null,
                currentPrizeImage: null,
                currentGameType: null,
                phaseStartedAt: now,
                phaseEndsAt: now,
                nextSlot: calcNextSlot(now),
                winnerId: null,
                winnerName: null,
            });
            return;
        }
        const slotDoc = slotQuery.docs[0];
        const slotData = slotDoc.data();
        const roomId = slotData.roomId;
        if (!roomId) {
            await slotDoc.ref.update({ status: 'DISABLED', enabled: false });
            return;
        }
        await slotDoc.ref.update({ status: 'LIVE', updatedAt: now });
        const roomDoc = await db.doc(`rooms/${roomId}`).get();
        if (!roomDoc.exists) {
            await slotDoc.ref.update({ status: 'DISABLED', enabled: false });
            return;
        }
        const room = roomDoc.data();
        await db.doc(`rooms/${roomId}`).update({ status: 'LIVE', updatedAt: now });
        const prizeTitle = room.prize?.title || room.prizeTitle || '경품';
        const prizeImageURL = room.prize?.imageURL || room.prizeImageURL || '';
        const estimatedValue = room.prize?.estimatedValue || room.estimatedValue || 0;
        const gameType = room.gameType || 'rps';
        firebase_functions_1.logger.info(`Starting cycle for room ${roomId}: ${prizeTitle}`);
        // ── Phase 1: ANNOUNCING ──
        let phaseStart = now;
        let phaseEnd = phaseStart + PHASES[0].duration * 1000;
        await rtdb.ref('cycle/main').set({
            currentPhase: 'ANNOUNCING',
            currentRoomId: roomId,
            currentPrizeTitle: prizeTitle,
            currentPrizeImage: prizeImageURL,
            currentGameType: gameType,
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
            nextSlot: calcNextSlot(now + 30 * 60 * 1000),
            winnerId: null,
            winnerName: null,
        });
        await sendBotChat(rtdb, 'main', `🎁 이번 경품은 "${prizeTitle}"입니다! 예상 가치: ${Number(estimatedValue).toLocaleString()}원!`);
        await sleep(PHASES[0].duration * 1000);
        // ── Phase 2: ENTRY_GATE ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[1].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'ENTRY_GATE',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        await sendBotChat(rtdb, 'main', '📺 광고를 시청하고 참가 티켓을 받으세요!');
        await sleep(PHASES[1].duration * 1000);
        // ── Phase 3: GAME_LOBBY ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[2].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'GAME_LOBBY',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        // 게임 세션 생성
        const sessionId = generateId();
        const ticketsSnap = await rtdb.ref(`rooms/main/tickets`).get();
        const ticketUsers = ticketsSnap.exists() ? Object.keys(ticketsSnap.val()) : [];
        // 티켓 유저가 없으면 봇 2명으로 진행
        const participants = ticketUsers.length > 0
            ? ticketUsers.map((uid) => ({ uid, eliminated: false, joinedAt: Date.now() }))
            : [
                { uid: 'BOT_1', eliminated: false, joinedAt: Date.now() },
                { uid: 'BOT_2', eliminated: false, joinedAt: Date.now() },
            ];
        await db.doc(`gameSessions/${sessionId}`).set({
            id: sessionId,
            roomId,
            gameType,
            phase: 'lobby',
            participants,
            currentRound: 0,
            totalRounds: Math.ceil(Math.log2(participants.length)),
            config: { minParticipants: 2, maxParticipants: 64, roundDurationSec: 5 },
            createdAt: Date.now(),
        });
        await rtdb.ref(`games/main/current`).set({
            sessionId,
            gameType,
            phase: 'lobby',
            currentRound: 0,
            totalRounds: Math.ceil(Math.log2(participants.length)),
            participantCount: participants.length,
            winnerId: null,
        });
        // 참가자 등록
        const participantUpdates = {};
        for (const p of participants) {
            participantUpdates[p.uid] = {
                displayName: p.uid.startsWith('BOT') ? `🤖 봇${p.uid.split('_')[1]}` : p.uid,
                photoURL: null,
                level: 1,
                alive: true,
            };
        }
        await rtdb.ref(`games/main/participants`).set(participantUpdates);
        await sendBotChat(rtdb, 'main', `🎮 ${participants.length}명이 참가했습니다! 곧 게임이 시작됩니다!`);
        await sleep(PHASES[2].duration * 1000);
        // ── Phase 4: GAME_COUNTDOWN ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[3].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'GAME_COUNTDOWN',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        await rtdb.ref(`games/main/current`).update({ phase: 'countdown' });
        await sleep(PHASES[3].duration * 1000);
        // ── Phase 5: GAME_PLAYING (자동 RPS 토너먼트) ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[4].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'GAME_PLAYING',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        let alivePlayers = participants.map((p) => p.uid);
        let roundNumber = 0;
        const maxRounds = Math.ceil(Math.log2(participants.length)) + 2;
        while (alivePlayers.length > 1 && roundNumber < maxRounds) {
            roundNumber++;
            firebase_functions_1.logger.info(`Round ${roundNumber}: ${alivePlayers.length} players`);
            // 매칭
            const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
            const matchups = [];
            for (let i = 0; i < shuffled.length; i += 2) {
                matchups.push({
                    matchId: generateId(),
                    p1: shuffled[i],
                    p2: shuffled[i + 1] || 'BOT_AUTO',
                });
            }
            // Realtime DB에 라운드 정보 업데이트
            await rtdb.ref(`games/main/current`).update({
                phase: 'playing',
                currentRound: roundNumber,
                roundStartedAt: Date.now(),
                roundEndsAt: Date.now() + 5000,
                countdown: 5,
            });
            // 매치 정보 설정
            for (const m of matchups) {
                await rtdb.ref(`games/main/playerMatch/${m.p1}`).set({
                    matchId: m.matchId,
                    opponentId: m.p2,
                });
                if (!m.p2.startsWith('BOT')) {
                    await rtdb.ref(`games/main/playerMatch/${m.p2}`).set({
                        matchId: m.matchId,
                        opponentId: m.p1,
                    });
                }
            }
            // 5초 대기 (선택 시간)
            await sleep(5000);
            // 선택 수집 + 자동 판정
            const choices = ['rock', 'paper', 'scissors'];
            const roundWinners = [];
            const matchResults = {};
            for (const m of matchups) {
                // 유저 선택 읽기
                const p1ChoiceSnap = await rtdb.ref(`games/main/choices/${m.matchId}/${m.p1}`).get();
                const p2ChoiceSnap = await rtdb.ref(`games/main/choices/${m.matchId}/${m.p2}`).get();
                const p1Choice = p1ChoiceSnap.exists() ? p1ChoiceSnap.val() : choices[Math.floor(Math.random() * 3)];
                const p2Choice = p2ChoiceSnap.exists() ? p2ChoiceSnap.val() : choices[Math.floor(Math.random() * 3)];
                // 승패 판정
                let winner;
                if (p1Choice === p2Choice) {
                    winner = Math.random() > 0.5 ? m.p1 : m.p2; // 무승부는 랜덤
                }
                else if ((p1Choice === 'rock' && p2Choice === 'scissors') ||
                    (p1Choice === 'scissors' && p2Choice === 'paper') ||
                    (p1Choice === 'paper' && p2Choice === 'rock')) {
                    winner = m.p1;
                }
                else {
                    winner = m.p2;
                }
                roundWinners.push(winner);
                matchResults[m.matchId] = {
                    player1: { id: m.p1, choice: p1Choice },
                    player2: { id: m.p2, choice: p2Choice },
                    winnerId: winner,
                };
            }
            // 결과 표시
            await rtdb.ref(`games/main/current`).update({
                phase: 'round_result',
                matchResults,
            });
            // 탈락자 처리
            for (const p of alivePlayers) {
                if (!roundWinners.includes(p)) {
                    await rtdb.ref(`games/main/participants/${p}`).update({
                        alive: false,
                        eliminatedRound: roundNumber,
                    });
                }
            }
            alivePlayers = roundWinners;
            await sendBotChat(rtdb, 'main', `⚔️ 라운드 ${roundNumber} 완료! ${alivePlayers.length}명 생존!`);
            await sleep(3000); // 결과 표시 시간
        }
        // ── Phase 6: GAME_RESULT ──
        const winnerId = alivePlayers[0] || null;
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[5].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'GAME_RESULT',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
            winnerId,
        });
        await rtdb.ref(`games/main/current`).update({
            phase: 'final_result',
            winnerId,
        });
        // Firestore에 우승자 기록
        await db.doc(`gameSessions/${sessionId}`).update({
            phase: 'completed',
            winnerId,
            completedAt: Date.now(),
        });
        if (winnerId && !winnerId.startsWith('BOT')) {
            await db.collection('winners').add({
                roomId,
                sessionId,
                winnerId,
                prizeTitle,
                prizeImageURL,
                estimatedValue,
                gameType,
                wonAt: Date.now(),
            });
        }
        await sleep(PHASES[5].duration * 1000);
        // ── Phase 7: WINNER_ANNOUNCE ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[6].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'WINNER_ANNOUNCE',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        const winnerName = winnerId?.startsWith('BOT') ? `🤖 봇` : (winnerId || '없음');
        await sendBotChat(rtdb, 'main', `🏆 축하합니다! ${winnerName}님이 "${prizeTitle}"을 획득했습니다!`);
        await sleep(PHASES[6].duration * 1000);
        // ── Phase 8: COOLDOWN ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[7].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'COOLDOWN',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        // 정리
        await rtdb.ref(`rooms/main/tickets`).remove();
        await rtdb.ref(`games/main`).remove();
        await sleep(PHASES[7].duration * 1000);
        // 완료
        await slotDoc.ref.update({ status: 'COMPLETED', updatedAt: Date.now() });
        await db.doc(`rooms/${roomId}`).update({ status: 'COMPLETED', updatedAt: Date.now() });
        await db.collection('cycleLogs').add({
            roomId, prizeTitle, gameType, winnerId,
            startedAt: now,
            completedAt: Date.now(),
        });
        await rtdb.ref('cycle/main').set({
            currentPhase: 'IDLE',
            currentRoomId: null,
            currentPrizeTitle: null,
            currentPrizeImage: null,
            currentGameType: null,
            phaseStartedAt: Date.now(),
            phaseEndsAt: Date.now(),
            nextSlot: calcNextSlot(Date.now()),
            winnerId: null,
            winnerName: null,
        });
        firebase_functions_1.logger.info(`Cycle completed for room ${roomId}, winner: ${winnerId}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Game cycle error:', error);
        throw error;
    }
});
//# sourceMappingURL=gameCycle.js.map