"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameCycle = void 0;
// functions/src/cycle/gameCycle.ts
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("firebase-admin/database");
const auth_1 = require("firebase-admin/auth");
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
        // ── 과거 미실행 슬롯 자동 정리 ──
        const staleQuery = await db
            .collection('scheduleSlots')
            .where('status', '==', 'ASSIGNED')
            .where('scheduledAt', '<', now - 10 * 60 * 1000)
            .get();
        if (!staleQuery.empty) {
            const batch = db.batch();
            for (const staleDoc of staleQuery.docs) {
                firebase_functions_1.logger.warn(`Marking stale slot as EXPIRED: ${staleDoc.id}`);
                batch.update(staleDoc.ref, {
                    status: 'EXPIRED',
                    updatedAt: now,
                    expiredReason: 'missed_execution',
                });
            }
            await batch.commit();
            firebase_functions_1.logger.info(`Expired ${staleQuery.size} stale slots`);
        }
        const slotQuery = await db
            .collection('scheduleSlots')
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
        const ticketEntries = ticketsSnap.exists() ? ticketsSnap.val() : {};
        const ticketUsers = Object.keys(ticketEntries);
        // 티켓 유저가 없으면 봇 2명으로 진행
        const participants = ticketUsers.length > 0
            ? ticketUsers.map((uid) => ({
                uid,
                displayName: ticketEntries[uid]?.displayName || uid,
                eliminated: false,
                joinedAt: Date.now(),
            }))
            : [
                { uid: 'BOT_1', displayName: '봇1', eliminated: false, joinedAt: Date.now() },
                { uid: 'BOT_2', displayName: '봇2', eliminated: false, joinedAt: Date.now() },
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
            let displayName = p.displayName || p.uid;
            let photoURL = null;
            if (!p.uid.startsWith('BOT')) {
                try {
                    const userRecord = await (0, auth_1.getAuth)().getUser(p.uid);
                    displayName = userRecord.displayName || userRecord.email || p.uid;
                    photoURL = userRecord.photoURL || null;
                }
                catch {
                    // 유저 조회 실패 시 티켓의 displayName 사용
                }
            }
            participantUpdates[p.uid] = {
                displayName,
                photoURL,
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
        // ── Phase 5: GAME_PLAYING (게임 타입별 분기) ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[4].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'GAME_PLAYING',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        let winnerId = null;
        const GAME_TYPES = [
            'luckyDice', 'stockRace', 'highLow', 'coinBet', 'horseRace',
            'floorRoulette', 'goldRush', 'bombDefuse', 'tideWave', 'treasureHunt',
        ];
        const GAME_NAMES = {
            luckyDice: '🎲 운명의 주사위',
            stockRace: '📈 주식 레이스',
            highLow: '🃏 하이 & 로우',
            coinBet: '🪙 코인 올인',
            horseRace: '🏇 경마 레이스',
            floorRoulette: '🎯 바닥 룰렛',
            goldRush: '⛏️ 골드러시',
            bombDefuse: '💣 폭탄 해제',
            tideWave: '🌊 밀물 썰물',
            treasureHunt: '🗺️ 보물찾기',
        };
        const pickedGameType = GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
        const allPlayers = participants.map((p) => p.uid);
        const TOTAL_ROUNDS = 10;
        const scores = {};
        const nameMap = {};
        allPlayers.forEach((pid) => { scores[pid] = 0; });
        participants.forEach((p) => { nameMap[p.uid] = p.displayName || p.uid.slice(0, 6); });
        await rtdb.ref('games/main/current').update({
            gameType: pickedGameType,
            gameName: GAME_NAMES[pickedGameType],
            phase: 'game_intro',
            totalPlayers: allPlayers.length,
            totalRounds: TOTAL_ROUNDS,
            scores,
            nameMap,
        });
        await sendBotChat(rtdb, 'main', `🎮 ${GAME_NAMES[pickedGameType]} 시작! ${allPlayers.length}명 전원 참가! 10라운드!`);
        await sleep(4000);
        const getMultiplier = (round) => (round === TOTAL_ROUNDS ? 2 : 1);
        const broadcastScores = async (round) => {
            const sortedLocal = Object.entries(scores).sort((a, b) => b[1] - a[1]);
            const top3 = sortedLocal.slice(0, 3).map(([pid, s], i) => `${['🥇', '🥈', '🥉'][i]}${nameMap[pid]}: ${s}점`).join(' ');
            await rtdb.ref('games/main/current').update({
                phase: 'round_result',
                round,
                scores: { ...scores },
                leaderboard: top3,
                totalPlayers: allPlayers.length,
            });
        };
        switch (pickedGameType) {
            case 'luckyDice': {
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const mult = getMultiplier(r);
                    const dice = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1);
                    const sum = dice.reduce((a, b) => a + b, 0);
                    const hasSeven = sum === 7 || sum === 14;
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, mult,
                        message: '🎲 주사위 3개! SAFE(합계÷2 점수) or RISK(합계 그대로, 단 7/14면 0점)?',
                        choiceDeadline: Date.now() + 15000,
                    });
                    await sleep(15000);
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        const choice = choices[pid] || 'safe';
                        roundResults[pid] = choice === 'risk'
                            ? (hasSeven ? 0 : sum * mult)
                            : Math.floor(sum / 2) * mult;
                        scores[pid] += roundResults[pid];
                    }
                    await rtdb.ref('games/main/current').update({
                        dice, sum, hasSeven, roundResults,
                        message: `🎲 주사위: ${dice.join('+')}=${sum} ${hasSeven ? '💥 위험 숫자!' : '✅ 안전!'}`,
                    });
                    await broadcastScores(r);
                    await sleep(4000);
                }
                break;
            }
            case 'stockRace': {
                const stocks = ['🚀 로켓코인', '💎 다이아주식', '🔥 파이어토큰'];
                const stockPrices = [100, 100, 100];
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const mult = getMultiplier(r);
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, mult,
                        stocks, stockPrices: [...stockPrices],
                        message: `📈 어디에 투자? ${stocks.map((s, i) => `${s}(${stockPrices[i]})`).join(' | ')}`,
                        choiceDeadline: Date.now() + 12000,
                    });
                    await sleep(12000);
                    const changes = stocks.map(() => Math.floor(Math.random() * 81) - 30);
                    changes.forEach((c, i) => { stockPrices[i] = Math.max(10, stockPrices[i] + c); });
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        const pick = choices[pid] !== undefined ? parseInt(choices[pid], 10) : Math.floor(Math.random() * 3);
                        const gain = Math.max(0, changes[pick]) * mult;
                        roundResults[pid] = gain;
                        scores[pid] += gain;
                    }
                    await rtdb.ref('games/main/current').update({
                        changes, stockPrices: [...stockPrices], roundResults,
                        message: `📈 ${stocks.map((s, i) => `${s} ${changes[i] >= 0 ? '+' : ''}${changes[i]}`).join(' | ')}`,
                    });
                    await broadcastScores(r);
                    await sleep(4000);
                }
                break;
            }
            case 'highLow': {
                let currentCard = Math.floor(Math.random() * 13) + 1;
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const mult = getMultiplier(r);
                    const cardName = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][currentCard - 1];
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, mult, currentCard, cardName,
                        message: `🃏 현재 카드: ${cardName} → 다음 카드가 HIGH? LOW?`,
                        choiceDeadline: Date.now() + 10000,
                    });
                    await sleep(10000);
                    const nextCard = Math.floor(Math.random() * 13) + 1;
                    const nextName = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][nextCard - 1];
                    const actual = nextCard > currentCard ? 'high' : nextCard < currentCard ? 'low' : 'same';
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        const pick = choices[pid] || (Math.random() < 0.5 ? 'high' : 'low');
                        if (actual === 'same')
                            roundResults[pid] = 30 * mult;
                        else if (pick === actual)
                            roundResults[pid] = 20 * mult;
                        else
                            roundResults[pid] = 0;
                        scores[pid] += roundResults[pid];
                    }
                    currentCard = nextCard;
                    await rtdb.ref('games/main/current').update({
                        nextCard, nextName, actual, roundResults,
                        message: `🃏 ${cardName} → ${nextName}! 정답: ${actual === 'same' ? '같다! 모두 보너스!' : actual.toUpperCase()}`,
                    });
                    await broadcastScores(r);
                    await sleep(4000);
                }
                break;
            }
            case 'coinBet': {
                const bank = {};
                allPlayers.forEach((pid) => { bank[pid] = 500; });
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, banks: { ...bank },
                        message: '🪙 얼마를 걸까? (10/30/50/올인) 앞면=2배, 뒷면=잃음!',
                        choiceDeadline: Date.now() + 12000,
                    });
                    await sleep(12000);
                    const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        const betStr = choices[pid] || '10';
                        let bet = 10;
                        if (betStr === 'allin')
                            bet = bank[pid];
                        else
                            bet = Math.min(parseInt(betStr, 10) || 10, bank[pid]);
                        bet = Math.max(0, bet);
                        if (coinResult === 'heads') {
                            bank[pid] += bet;
                            roundResults[pid] = { bet, result: bet };
                        }
                        else {
                            bank[pid] -= bet;
                            roundResults[pid] = { bet, result: -bet };
                        }
                        bank[pid] = Math.max(0, bank[pid]);
                    }
                    if (r === TOTAL_ROUNDS) {
                        allPlayers.forEach((pid) => { scores[pid] = bank[pid]; });
                    }
                    await rtdb.ref('games/main/current').update({
                        coinResult, roundResults, banks: { ...bank },
                        message: `🪙 ${coinResult === 'heads' ? '😀 앞면! 배팅 2배!' : '🌙 뒷면! 배팅 잃음!'}`,
                    });
                    const sortedBank = Object.entries(bank).sort((a, b) => b[1] - a[1]);
                    const top3 = sortedBank.slice(0, 3).map(([pid, s], i) => `${['🥇', '🥈', '🥉'][i]}${nameMap[pid]}: ${s}`).join(' ');
                    await rtdb.ref('games/main/current').update({ phase: 'round_result', round: r, leaderboard: top3 });
                    await sleep(4000);
                }
                allPlayers.forEach((pid) => { scores[pid] = bank[pid]; });
                break;
            }
            case 'horseRace': {
                const horses = ['🐎 번개', '🦄 유니콘', '🐴 돌풍', '🏇 질주', '🎠 회전목마'];
                const payouts = [100, 60, 30, 10, 0];
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const mult = getMultiplier(r);
                    const odds = horses.map(() => (Math.random() * 4 + 1).toFixed(1));
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, mult, horses, odds,
                        message: `🏇 어느 말에 걸까? ${horses.map((h, i) => `${h}(x${odds[i]})`).join(' ')}`,
                        choiceDeadline: Date.now() + 12000,
                    });
                    await sleep(12000);
                    const result = [...horses].sort(() => Math.random() - 0.5);
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        const pick = choices[pid] !== undefined ? parseInt(choices[pid], 10) : Math.floor(Math.random() * 5);
                        const pickedHorse = horses[pick];
                        const rank = result.indexOf(pickedHorse);
                        roundResults[pid] = payouts[rank] * mult;
                        scores[pid] += roundResults[pid];
                    }
                    await rtdb.ref('games/main/current').update({
                        raceResult: result, roundResults,
                        message: `🏇 결과: ${result.map((h, i) => `${i + 1}등 ${h}`).join(' > ')}`,
                    });
                    await broadcastScores(r);
                    await sleep(5000);
                }
                break;
            }
            case 'floorRoulette': {
                const zones = ['🟥 빨강', '🟦 파랑', '🟩 초록', '🟨 노랑'];
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const mult = getMultiplier(r);
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, mult, zones,
                        message: '🎯 어느 구역에 서시겠습니까? 적게 몰리면 더 높은 점수!',
                        choiceDeadline: Date.now() + 10000,
                    });
                    await sleep(10000);
                    const winZone = Math.floor(Math.random() * 4);
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const zoneCounts = [0, 0, 0, 0];
                    const playerZones = {};
                    for (const pid of allPlayers) {
                        const pick = choices[pid] !== undefined ? parseInt(choices[pid], 10) : Math.floor(Math.random() * 4);
                        playerZones[pid] = pick;
                        zoneCounts[pick]++;
                    }
                    const winnersCount = zoneCounts[winZone] || 1;
                    const pointPerWinner = Math.floor((200 / winnersCount)) * mult;
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        roundResults[pid] = playerZones[pid] === winZone ? pointPerWinner : 0;
                        scores[pid] += roundResults[pid];
                    }
                    await rtdb.ref('games/main/current').update({
                        winZone, winZoneName: zones[winZone], zoneCounts, roundResults,
                        message: `🎯 당첨: ${zones[winZone]}! (${winnersCount}명 → 각 ${pointPerWinner}점)`,
                    });
                    await broadcastScores(r);
                    await sleep(4000);
                }
                break;
            }
            case 'goldRush': {
                const mines = ['⛏️ A광산', '🏔️ B광산', '🌋 C광산'];
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const mult = getMultiplier(r);
                    const golds = mines.map(() => Math.floor(Math.random() * 251) + 50);
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, mult, mines,
                        message: '⛏️ 어느 광산? 금은 랜덤! 사람 적은 곳이 유리!',
                        choiceDeadline: Date.now() + 10000,
                    });
                    await sleep(10000);
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const mineCounts = [0, 0, 0];
                    const playerMines = {};
                    for (const pid of allPlayers) {
                        const pick = choices[pid] !== undefined ? parseInt(choices[pid], 10) : Math.floor(Math.random() * 3);
                        playerMines[pid] = pick;
                        mineCounts[pick]++;
                    }
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        const mine = playerMines[pid];
                        const miners = Math.max(1, mineCounts[mine]);
                        const earned = Math.floor(golds[mine] / miners) * mult;
                        roundResults[pid] = earned;
                        scores[pid] += earned;
                    }
                    await rtdb.ref('games/main/current').update({
                        golds, mineCounts, roundResults,
                        message: `⛏️ 금: ${mines.map((m, i) => `${m} ${golds[i]}g(${mineCounts[i]}명)`).join(' | ')}`,
                    });
                    await broadcastScores(r);
                    await sleep(4000);
                }
                break;
            }
            case 'bombDefuse': {
                const wires = ['🔴 빨간선', '🔵 파란선', '🟢 초록선'];
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const mult = getMultiplier(r);
                    const bombWire = Math.floor(Math.random() * 3);
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, mult, wires,
                        message: '💣 폭탄 해제! 3개 선 중 하나를 자르세요! 1개가 폭탄!',
                        choiceDeadline: Date.now() + 10000,
                    });
                    await sleep(10000);
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        const pick = choices[pid] !== undefined ? parseInt(choices[pid], 10) : Math.floor(Math.random() * 3);
                        roundResults[pid] = pick === bombWire ? -30 * mult : 50 * mult;
                        scores[pid] = Math.max(0, scores[pid] + roundResults[pid]);
                    }
                    await rtdb.ref('games/main/current').update({
                        bombWire, bombWireName: wires[bombWire], roundResults,
                        message: `💣 폭탄은 ${wires[bombWire]}! 💥`,
                    });
                    await broadcastScores(r);
                    await sleep(4000);
                }
                break;
            }
            case 'tideWave': {
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const mult = getMultiplier(r);
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, mult,
                        message: '🌊 0~100 중 숫자를 선택! 해수면보다 높으면 생존! 낮을수록 고득점!',
                        choiceDeadline: Date.now() + 12000,
                    });
                    await sleep(12000);
                    const seaLevel = Math.floor(Math.random() * 80) + 10;
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        const pick = choices[pid] !== undefined ? parseInt(choices[pid], 10) : 50;
                        const clamped = Math.max(0, Math.min(100, pick));
                        roundResults[pid] = clamped >= seaLevel ? (100 - clamped) * mult : 0;
                        scores[pid] += roundResults[pid];
                    }
                    await rtdb.ref('games/main/current').update({
                        seaLevel, roundResults,
                        message: `🌊 해수면: ${seaLevel}! 낮은 숫자로 살아남은 사람이 고득점!`,
                    });
                    await broadcastScores(r);
                    await sleep(4000);
                }
                break;
            }
            case 'treasureHunt': {
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const mult = getMultiplier(r);
                    const grid = new Array(25).fill(0);
                    const diamond = Math.floor(Math.random() * 25);
                    grid[diamond] = 100;
                    let gold1 = Math.floor(Math.random() * 25);
                    while (gold1 === diamond)
                        gold1 = Math.floor(Math.random() * 25);
                    grid[gold1] = 50;
                    let gold2 = Math.floor(Math.random() * 25);
                    while (gold2 === diamond || gold2 === gold1)
                        gold2 = Math.floor(Math.random() * 25);
                    grid[gold2] = 50;
                    let silver1 = Math.floor(Math.random() * 25);
                    while ([diamond, gold1, gold2].includes(silver1))
                        silver1 = Math.floor(Math.random() * 25);
                    grid[silver1] = 20;
                    let silver2 = Math.floor(Math.random() * 25);
                    while ([diamond, gold1, gold2, silver1].includes(silver2))
                        silver2 = Math.floor(Math.random() * 25);
                    grid[silver2] = 20;
                    for (let t = 0; t < 3; t++) {
                        let trap = Math.floor(Math.random() * 25);
                        while (grid[trap] !== 0)
                            trap = Math.floor(Math.random() * 25);
                        grid[trap] = -20;
                    }
                    await rtdb.ref('games/main/current').update({
                        phase: 'playing', round: r, mult, gridSize: 25,
                        message: '🗺️ 5x5 보물지도! 한 칸을 선택하세요! (0~24번)',
                        choiceDeadline: Date.now() + 10000,
                    });
                    await sleep(10000);
                    const snap = await rtdb.ref(`games/main/choices/round${r}`).get();
                    const choices = snap.exists() ? snap.val() : {};
                    const roundResults = {};
                    for (const pid of allPlayers) {
                        const pick = choices[pid] !== undefined ? parseInt(choices[pid], 10) % 25 : Math.floor(Math.random() * 25);
                        const earned = grid[pick] * mult;
                        roundResults[pid] = earned;
                        scores[pid] = Math.max(0, scores[pid] + earned);
                    }
                    await rtdb.ref('games/main/current').update({
                        grid, roundResults,
                        message: `🗺️ 보물 공개! 💎=${diamond}번 🥇=${gold1},${gold2}번 💀=함정!`,
                    });
                    await broadcastScores(r);
                    await sleep(5000);
                }
                break;
            }
        }
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        winnerId = sorted[0]?.[0] || allPlayers[0] || null;
        const finalLeaderboard = sorted.slice(0, 5).map(([pid, s], i) => `${i + 1}위 ${nameMap[pid]}: ${s}점`).join('\n');
        await rtdb.ref('games/main/current').update({
            phase: 'final_result',
            winnerId,
            winnerName: winnerId ? nameMap[winnerId] : null,
            finalScores: scores,
            finalLeaderboard,
        });
        if (winnerId) {
            await sendBotChat(rtdb, 'main', `🏆 ${GAME_NAMES[pickedGameType]} 우승: ${nameMap[winnerId]}! (${sorted[0][1]}점)`);
        }
        // ── Phase 6: GAME_RESULT ──
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
            let winnerName = winnerId;
            let winnerPhoto = '';
            try {
                const winnerRecord = await (0, auth_1.getAuth)().getUser(winnerId);
                winnerName = winnerRecord.displayName || winnerRecord.email || winnerId;
                winnerPhoto = winnerRecord.photoURL || '';
            }
            catch {
                // keep fallback values
            }
            await db.collection('winners').add({
                roomId,
                sessionId,
                winnerId,
                winnerName,
                winnerPhoto,
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
        let winnerName = 'Unknown';
        let winnerPhoto = '';
        if (winnerId) {
            try {
                const winnerRecord = await (0, auth_1.getAuth)().getUser(winnerId);
                winnerName = winnerRecord.displayName || winnerRecord.email || winnerId;
                winnerPhoto = winnerRecord.photoURL || '';
            }
            catch {
                // BOT이거나 유저 조회 실패 시
                if (winnerId.startsWith('BOT')) {
                    winnerName = `봇 ${winnerId}`;
                }
                else {
                    winnerName = winnerId;
                }
            }
        }
        await rtdb.ref('cycle/main').update({
            currentPhase: 'WINNER_ANNOUNCE',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
            winnerId,
            winnerName,
            winnerPhoto,
        });
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