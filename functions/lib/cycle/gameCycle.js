"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameCycle = void 0;
// functions/src/cycle/gameCycle.ts
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const database_1 = require("firebase-admin/database");
const auth_1 = require("firebase-admin/auth");
const firebase_functions_1 = require("firebase-functions");
const geminiGameQuiz_1 = require("../lib/geminiGameQuiz");
const PHASES = [
    { phase: 'ANNOUNCING', duration: 10 },
    { phase: 'GAME_LOBBY', duration: 15 },
    { phase: 'GAME_COUNTDOWN', duration: 3 },
    { phase: 'GAME_PLAYING', duration: 300 },
    { phase: 'GAME_RESULT', duration: 10 },
    { phase: 'WINNER_ANNOUNCE', duration: 10 },
    { phase: 'COOLDOWN', duration: 5 },
];
function calcNextSlot(nowMs) {
    const kst = new Date(nowMs + 9 * 60 * 60 * 1000);
    const y = kst.getUTCFullYear();
    let mo = kst.getUTCMonth(); // 0-based
    let d = kst.getUTCDate();
    const h = kst.getUTCHours();
    const m = kst.getUTCMinutes();
    let slotH;
    let slotM;
    if (m < 30) {
        slotM = 30;
        slotH = h;
    }
    else {
        slotM = 0;
        slotH = h + 1;
    }
    if (slotH >= 24) {
        slotH -= 24;
        const nextDay = new Date(Date.UTC(y, mo, d + 1));
        mo = nextDay.getUTCMonth();
        d = nextDay.getUTCDate();
    }
    const moStr = String(mo + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const hStr = String(slotH).padStart(2, '0');
    const mStr = String(slotM).padStart(2, '0');
    return `${y}-${moStr}-${dStr} ${hStr}:${mStr} KST`;
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
function getChestHint(chest, round) {
    const hints = {
        gold: ['✨ 빛나는 황금 상자', '👑 왕관이 새겨진 상자', '🌟 별빛이 나는 상자'],
        silver: ['🪙 은색 무늬 상자', '⚪ 하얀 빛의 상자'],
        bronze: ['🟤 갈색 상자', '📦 평범해 보이는 상자'],
        tiny: ['🫧 작은 상자', '💧 이슬이 맺힌 상자'],
        empty: ['📦 가벼운 상자', '🫥 텅 빈 느낌의 상자'],
        trap: ['⚠️ 수상한 상자', '🔴 붉은 빛의 상자', '💀 해골 무늬 상자'],
        bomb: ['⚠️ 째깍거리는 상자', '🔴 뜨거운 상자', '💣 위험해 보이는 상자'],
        mirror: ['🪞 반짝이는 상자', '🔮 신비로운 상자'],
        double: ['✨ 쌍둥이 문양 상자', '🎭 두 얼굴의 상자'],
        steal: ['🦊 여우 문양 상자', '🎭 가면 상자'],
    };
    const pool = hints[chest.type] || ['📦 상자'];
    if (round >= 8)
        return '❓ 알 수 없는 상자';
    return pool[Math.floor(Math.random() * pool.length)];
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
        // LIVE 상태인 슬롯이 있으면 이미 진행 중이므로 스킵
        const liveQuery = await db
            .collection('scheduleSlots')
            .where('status', '==', 'LIVE')
            .limit(1)
            .get();
        if (!liveQuery.empty) {
            firebase_functions_1.logger.info('A LIVE slot already exists, skipping this cycle');
            return;
        }
        // RTDB cycle/main이 IDLE/COOLDOWN이 아니면 스킵
        const cycleSnap = await rtdb.ref('cycle/main/currentPhase').get();
        const currentPhase = cycleSnap.exists() ? cycleSnap.val() : 'IDLE';
        if (currentPhase !== 'IDLE' && currentPhase !== 'COOLDOWN') {
            firebase_functions_1.logger.info(`Cycle already running (phase: ${currentPhase}), skipping`);
            return;
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
        // ── Phase 2: GAME_LOBBY ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[1].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'GAME_LOBBY',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        await sleep(PHASES[1].duration * 1000);
        const presenceSnap = await rtdb.ref('rooms/main/presence').get();
        const presenceData = presenceSnap.exists()
            ? presenceSnap.val()
            : {};
        const presenceUsers = [];
        for (const [key, val] of Object.entries(presenceData)) {
            const uidValue = val && typeof val === 'object' && 'uid' in val
                ? val.uid
                : key;
            if (uidValue && !uidValue.startsWith('BOT') && !presenceUsers.includes(uidValue)) {
                presenceUsers.push(uidValue);
            }
        }
        firebase_functions_1.logger.info(`Collected ${presenceUsers.length} participants from presence`);
        const participants = presenceUsers.length >= 2
            ? presenceUsers.map((uid) => {
                const val = presenceData[uid];
                return {
                    uid,
                    displayName: val?.displayName || uid,
                    eliminated: false,
                    joinedAt: Date.now(),
                };
            })
            : [
                { uid: 'BOT_1', displayName: '봇1', eliminated: false, joinedAt: Date.now() },
                { uid: 'BOT_2', displayName: '봇2', eliminated: false, joinedAt: Date.now() },
            ];
        // 게임 세션 생성
        const sessionId = generateId();
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
        // ── Phase 3: GAME_COUNTDOWN ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[2].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'GAME_COUNTDOWN',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        await rtdb.ref(`games/main/current`).update({ phase: 'countdown' });
        await sleep(PHASES[2].duration * 1000);
        // ── Phase 4: GAME_PLAYING (게임 타입별 분기) ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[3].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'GAME_PLAYING',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        let winnerId = null;
        const GAME_TYPES = [
            'drawGuess', 'lineRunner', 'bigRoulette', 'typingBattle', 'weaponForge',
            'priceGuess', 'oxSurvival', 'destinyAuction', 'nunchiGame', 'quickTouch',
        ];
        const GAME_NAMES = {
            drawGuess: '🎨 그림 맞추기',
            lineRunner: '✏️ 라인 러너',
            bigRoulette: '🎰 빅 룰렛',
            typingBattle: '⌨️ 타이핑 배틀',
            weaponForge: '⚔️ 무기 강화 대전',
            priceGuess: '💰 가격 맞추기',
            oxSurvival: '⭕ OX 서바이벌',
            destinyAuction: '🎰 운명의 경매',
            nunchiGame: '👀 눈치 게임',
            quickTouch: '🎯 순발력 터치',
        };
        const LIAR_WORDS = [
            { category: '음식', words: ['떡볶이', '김치찌개', '치킨', '삼겹살', '비빔밥', '짜장면', '떡국', '불고기', '냉면', '김밥'] },
            { category: '동물', words: ['고양이', '강아지', '펭귄', '코끼리', '기린', '사자', '토끼', '햄스터', '돌고래', '앵무새'] },
            { category: '장소', words: ['학교', '편의점', '놀이공원', '병원', '도서관', '영화관', '공항', '수영장', '카페', '지하철'] },
            { category: '직업', words: ['의사', '소방관', '요리사', '경찰', '선생님', '가수', '과학자', '운동선수', '화가', '우주비행사'] },
            { category: '사물', words: ['우산', '냉장고', '스마트폰', '자전거', '안경', '시계', '가방', '신발', '텔레비전', '에어컨'] },
        ];
        const pickedGameType = GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
        const allPlayers = participants.map((p) => p.uid);
        const TOTAL_ROUNDS = 10;
        let totalRoundsForGame = TOTAL_ROUNDS;
        const scores = {};
        const nameMap = {};
        const alive = {};
        allPlayers.forEach((pid) => { scores[pid] = 0; });
        participants.forEach((p) => {
            nameMap[p.uid] = p.displayName || p.uid.slice(0, 6);
            alive[p.uid] = true;
        });
        // ── Gemini로 라운드 데이터 생성 ──
        const roundsData = {};
        let gameConfig = {};
        let mainChipsRef = null;
        let mainRouletteCoinsRef = null;
        switch (pickedGameType) {
            case 'drawGuess': {
                const words = await (0, geminiGameQuiz_1.generateDrawWords)(TOTAL_ROUNDS);
                const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    roundsData[`round${r}`] = {
                        round: r,
                        drawerId: shuffled[(r - 1) % shuffled.length],
                        drawerName: nameMap[shuffled[(r - 1) % shuffled.length]],
                        word: words[r - 1]?.word || '고양이',
                        category: words[r - 1]?.category || '기본',
                        difficulty: words[r - 1]?.difficulty || 'easy',
                        timeLimit: 60,
                        guessed: false,
                    };
                }
                gameConfig = { type: 'drawGuess', needsCanvas: true };
                break;
            }
            case 'lineRunner': {
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const obstacles = [];
                    for (let i = 0; i < 15 + r * 3; i++) {
                        obstacles.push({
                            x: 300 + i * (200 - r * 10 + Math.floor(Math.random() * 80)),
                            y: Math.floor(Math.random() * 250) + 50,
                            w: 30 + Math.floor(Math.random() * 40),
                            h: 30 + Math.floor(Math.random() * 40),
                        });
                    }
                    roundsData[`round${r}`] = { round: r, obstacles, speedMultiplier: 1 + r * 0.15, timeLimit: 30 };
                }
                gameConfig = { type: 'lineRunner', needsCanvas: true };
                break;
            }
            case 'bigRoulette': {
                const SEGMENTS = [
                    { label: '×2', mult: 2, color: '#3b82f6' },
                    { label: '×3', mult: 3, color: '#8b5cf6' },
                    { label: '×1', mult: 1, color: '#6b7280' },
                    { label: '×5', mult: 5, color: '#f59e0b' },
                    { label: '×2', mult: 2, color: '#3b82f6' },
                    { label: '💀', mult: 0, color: '#ef4444' },
                    { label: '×3', mult: 3, color: '#8b5cf6' },
                    { label: '×10', mult: 10, color: '#ec4899' },
                    { label: '×1', mult: 1, color: '#6b7280' },
                    { label: '×2', mult: 2, color: '#3b82f6' },
                    { label: '×5', mult: 5, color: '#f59e0b' },
                    { label: '×20', mult: 20, color: '#dc2626' },
                ];
                const BASE_COINS = [100, 120, 150, 200, 260, 340, 440, 580, 760, 1000];
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const targetIdx = Math.floor(Math.random() * SEGMENTS.length);
                    roundsData[`round${r}`] = {
                        round: r,
                        targetSegmentIdx: targetIdx,
                        baseCoins: BASE_COINS[r - 1],
                        timeLimit: 15,
                    };
                }
                gameConfig = { type: 'bigRoulette', segments: SEGMENTS, startingCoins: 500 };
                const rouletteCoins = {};
                for (const pid of allPlayers)
                    rouletteCoins[pid] = 500;
                mainRouletteCoinsRef = rouletteCoins;
                break;
            }
            case 'typingBattle': {
                const sentences = await (0, geminiGameQuiz_1.generateTypingSentences)(TOTAL_ROUNDS);
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    roundsData[`round${r}`] = { round: r, sentence: sentences[r - 1] || `타이핑 테스트 ${r}`, timeLimit: 20 };
                }
                gameConfig = { type: 'typingBattle' };
                break;
            }
            case 'weaponForge': {
                const WEAPONS = [
                    { id: 'longsword', name: '롱소드', emoji: '⚔️', rarity: 'common' },
                    { id: 'dagger', name: '단검', emoji: '🗡️', rarity: 'common' },
                    { id: 'knife', name: '칼', emoji: '🔪', rarity: 'common' },
                    { id: 'dualBlade', name: '이도류', emoji: '⚔️', rarity: 'rare' },
                    { id: 'greatsword', name: '대검', emoji: '🗡️', rarity: 'rare' },
                    { id: 'bow', name: '활', emoji: '🏹', rarity: 'common' },
                    { id: 'spear', name: '창', emoji: '🔱', rarity: 'rare' },
                    { id: 'battleaxe', name: '전투도끼', emoji: '⛏️', rarity: 'rare' },
                    { id: 'staff', name: '지팡이', emoji: '🪄', rarity: 'epic' },
                    { id: 'combatsword', name: '전투검', emoji: '🛡️', rarity: 'common' },
                    { id: 'crossbow', name: '쇠뇌', emoji: '🔫', rarity: 'rare' },
                    { id: 'halberd', name: '할버드', emoji: '🪓', rarity: 'epic' },
                    { id: 'demonsword', name: '마검', emoji: '💎', rarity: 'legendary' },
                    { id: 'moonblade', name: '월광검', emoji: '🌙', rarity: 'legendary' },
                    { id: 'meteorsword', name: '운석검', emoji: '☄️', rarity: 'legendary' },
                ];
                const ROUND_MULTIPLIER = [1, 1, 1, 2, 2, 2, 3, 3, 3, 5];
                const ENHANCE_TABLE = [
                    { success: 95, fail: 5, down: 0, destroy: 0 },
                    { success: 90, fail: 10, down: 0, destroy: 0 },
                    { success: 85, fail: 15, down: 0, destroy: 0 },
                    { success: 75, fail: 25, down: 0, destroy: 0 },
                    { success: 65, fail: 35, down: 0, destroy: 0 },
                    { success: 55, fail: 40, down: 5, destroy: 0 },
                    { success: 45, fail: 40, down: 15, destroy: 0 },
                    { success: 35, fail: 35, down: 25, destroy: 5 },
                    { success: 25, fail: 30, down: 30, destroy: 15 },
                    { success: 15, fail: 25, down: 35, destroy: 25 },
                ];
                const shuffledWeapons = [...WEAPONS].sort(() => Math.random() - 0.5);
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const weapon = shuffledWeapons[(r - 1) % shuffledWeapons.length];
                    roundsData[`round${r}`] = {
                        round: r,
                        weapon,
                        enhanceTable: ENHANCE_TABLE,
                        multiplier: ROUND_MULTIPLIER[r - 1],
                        timeLimit: 15,
                        maxLevel: 10,
                        perfectBonus: 20,
                    };
                }
                gameConfig = { type: 'weaponForge' };
                break;
            }
            case 'priceGuess': {
                const items = await (0, geminiGameQuiz_1.generatePriceItems)(TOTAL_ROUNDS);
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const item = items[r - 1] || { name: `상품${r}`, price: 10000, hint: '📦', category: '기타' };
                    roundsData[`round${r}`] = { round: r, itemName: item.name, actualPrice: item.price, hint: item.hint, category: item.category, timeLimit: 15 };
                }
                gameConfig = { type: 'priceGuess' };
                break;
            }
            case 'oxSurvival': {
                const quizzes = await (0, geminiGameQuiz_1.generateOXQuizzes)(TOTAL_ROUNDS);
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const quiz = quizzes[r - 1] || { q: `비상 퀴즈 ${r}`, a: true, explanation: '' };
                    roundsData[`round${r}`] = { round: r, question: quiz.q, answer: quiz.a, explanation: quiz.explanation, timeLimit: 10 };
                }
                gameConfig = { type: 'oxSurvival', elimination: true };
                break;
            }
            case 'destinyAuction': {
                const CHEST_POOL = [
                    { type: 'gold', label: '💎 대박!', points: 30 },
                    { type: 'silver', label: '🪙 괜찮은 보상', points: 20 },
                    { type: 'bronze', label: '🥉 소소한 보상', points: 10 },
                    { type: 'tiny', label: '💧 물방울', points: 5 },
                    { type: 'empty', label: '📦 빈 상자', points: 0 },
                    { type: 'trap', label: '💀 함정!', points: -15 },
                    { type: 'bomb', label: '💣 폭탄!', points: -20 },
                    { type: 'mirror', label: '🪞 거울 상자', points: 0, special: 'mirror' },
                    { type: 'double', label: '✨ 더블 찬스', points: 0, special: 'double' },
                    { type: 'steal', label: '🦊 도둑 상자', points: 0, special: 'steal' },
                ];
                const startingChips = 10;
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const pool = r <= 3
                        ? CHEST_POOL.filter((c) => !['bomb', 'steal', 'double'].includes(c.type))
                        : r <= 6
                            ? CHEST_POOL.filter((c) => c.type !== 'double')
                            : CHEST_POOL;
                    const chest = pool[Math.floor(Math.random() * pool.length)];
                    roundsData[`round${r}`] = {
                        round: r,
                        chest: { ...chest },
                        chestHint: getChestHint(chest, r),
                        timeLimit: 12,
                        minBid: 1,
                        maxBid: startingChips,
                    };
                }
                gameConfig = { type: 'destinyAuction', startingChips };
                const chips = {};
                for (const pid of allPlayers) {
                    chips[pid] = startingChips;
                }
                mainChipsRef = chips;
                break;
            }
            case 'nunchiGame': {
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    roundsData[`round${r}`] = { round: r, maxNumber: Math.max(3, allPlayers.length - r + 1), timeLimit: 15 };
                }
                gameConfig = { type: 'nunchiGame', elimination: true };
                break;
            }
            case 'quickTouch': {
                for (let r = 1; r <= TOTAL_ROUNDS; r++) {
                    const targets = [];
                    for (let i = 0; i < 8 + r * 2; i++) {
                        targets.push({
                            x: Math.floor(Math.random() * 80) + 10,
                            y: Math.floor(Math.random() * 70) + 10,
                            delay: i * (800 - r * 30) + Math.floor(Math.random() * 300),
                            size: Math.max(20, 50 - r * 2),
                        });
                    }
                    roundsData[`round${r}`] = { round: r, targets, duration: 15 };
                }
                gameConfig = { type: 'quickTouch' };
                break;
            }
        }
        // ── RTDB에 게임 데이터 쓰기 (클라이언트가 게임 진행) ──
        await rtdb.ref('games/main').set({
            current: {
                gameType: pickedGameType,
                gameName: GAME_NAMES[pickedGameType],
                phase: 'game_intro',
                introStartedAt: Date.now(),
                totalPlayers: allPlayers.length,
                totalRounds: totalRoundsForGame,
                round: 0,
                scores,
                nameMap,
                alive,
                startedAt: Date.now(),
                startedBy: allPlayers[0],
                config: gameConfig,
            },
            participants: Object.fromEntries(participants.map((p) => [
                p.uid,
                { displayName: p.displayName, level: 1, alive: true },
            ])),
            rounds: roundsData,
        });
        if (mainChipsRef) {
            await rtdb.ref('games/main/chips').set(mainChipsRef);
        }
        if (mainRouletteCoinsRef) {
            await rtdb.ref('games/main/rouletteCoins').set(mainRouletteCoinsRef);
        }
        await sendBotChat(rtdb, 'main', `🎮 ${GAME_NAMES[pickedGameType]} 시작! ${allPlayers.length}명 참가! ${totalRoundsForGame}라운드!`);
        // ── 클라이언트가 게임을 진행하는 동안 대기 (5분) ──
        await sleep(PHASES[3].duration * 1000);
        // ── 게임 끝난 후 최종 스코어 읽기 ──
        const finalSnap = await rtdb.ref('games/main/current/scores').get();
        const finalScores = finalSnap.exists() ? finalSnap.val() : scores;
        const sorted = Object.entries(finalScores).sort((a, b) => b[1] - a[1]);
        winnerId = sorted[0]?.[0] || allPlayers[0] || null;
        const finalLeaderboard = sorted.slice(0, 5).map(([pid, s], i) => `${i + 1}위 ${nameMap[pid] || pid}: ${s}점`).join('\n');
        await rtdb.ref('games/main/current').update({
            phase: 'final_result',
            winnerId,
            winnerName: winnerId ? (nameMap[winnerId] || winnerId) : null,
            finalScores,
            finalLeaderboard,
        });
        if (winnerId) {
            await sendBotChat(rtdb, 'main', `🏆 ${GAME_NAMES[pickedGameType]} 우승: ${nameMap[winnerId] || winnerId}! (${sorted[0][1]}점)`);
        }
        // ── Phase 5: GAME_RESULT ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[4].duration * 1000;
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
        await sleep(PHASES[4].duration * 1000);
        // ── Phase 6: WINNER_ANNOUNCE ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[5].duration * 1000;
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
        await sleep(PHASES[5].duration * 1000);
        // ── Phase 7: COOLDOWN ──
        phaseStart = Date.now();
        phaseEnd = phaseStart + PHASES[6].duration * 1000;
        await rtdb.ref('cycle/main').update({
            currentPhase: 'COOLDOWN',
            phaseStartedAt: phaseStart,
            phaseEndsAt: phaseEnd,
        });
        // 정리
        await rtdb.ref(`games/main`).remove();
        await sleep(PHASES[6].duration * 1000);
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