// functions/src/cycle/gameCycle.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import {
  generateOXQuizzes,
  generatePriceItems,
  generateBombQuizzes,
  generateDrawWords,
  generateTypingSentences,
} from '../lib/geminiGameQuiz';

const PHASES = [
  { phase: 'ANNOUNCING', duration: 30 },
  { phase: 'GAME_LOBBY', duration: 30 },
  { phase: 'GAME_COUNTDOWN', duration: 5 },
  { phase: 'GAME_PLAYING', duration: 300 },
  { phase: 'GAME_RESULT', duration: 15 },
  { phase: 'WINNER_ANNOUNCE', duration: 15 },
  { phase: 'COOLDOWN', duration: 15 },
] as const;

function calcNextSlot(nowMs: number): string {
  const kst = new Date(nowMs + 9 * 60 * 60 * 1000);
  const y = kst.getFullYear();
  const mo = String(kst.getMonth() + 1).padStart(2, '0');
  const d = String(kst.getDate()).padStart(2, '0');
  const h = kst.getHours();
  const m = kst.getMinutes();
  let slotH = h;
  let slotM: number;
  if (m < 30) { slotM = 30; } else { slotM = 0; slotH = h + 1; }
  if (slotH >= 24) slotH = 0;
  return `${y}-${mo}-${d}T${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

async function sendBotChat(rtdb: ReturnType<typeof getDatabase>, roomId: string, message: string): Promise<void> {
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

export const gameCycle = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'asia-northeast3',
    timeZone: 'Asia/Seoul',
    retryCount: 1,
    timeoutSeconds: 540,
  },
  async () => {
    const db = getFirestore();
    const rtdb = getDatabase();
    const now = Date.now();

    logger.info('Game cycle started', { timestamp: new Date().toISOString() });

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
          logger.warn(`Marking stale slot as EXPIRED: ${staleDoc.id}`);
          batch.update(staleDoc.ref, {
            status: 'EXPIRED',
            updatedAt: now,
            expiredReason: 'missed_execution',
          });
        }
        await batch.commit();
        logger.info(`Expired ${staleQuery.size} stale slots`);
      }

      // LIVE 상태인 슬롯이 있으면 이미 진행 중이므로 스킵
      const liveQuery = await db
        .collection('scheduleSlots')
        .where('status', '==', 'LIVE')
        .limit(1)
        .get();

      if (!liveQuery.empty) {
        logger.info('A LIVE slot already exists, skipping this cycle');
        return;
      }

      // RTDB cycle/main이 IDLE/COOLDOWN이 아니면 스킵
      const cycleSnap = await rtdb.ref('cycle/main/currentPhase').get();
      const currentPhase = cycleSnap.exists() ? cycleSnap.val() : 'IDLE';
      if (currentPhase !== 'IDLE' && currentPhase !== 'COOLDOWN') {
        logger.info(`Cycle already running (phase: ${currentPhase}), skipping`);
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
        logger.info('No assigned slot found');
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
      const room = roomDoc.data() as Record<string, any>;
      await db.doc(`rooms/${roomId}`).update({ status: 'LIVE', updatedAt: now });

      const prizeTitle = room.prize?.title || room.prizeTitle || '경품';
      const prizeImageURL = room.prize?.imageURL || room.prizeImageURL || '';
      const estimatedValue = room.prize?.estimatedValue || room.estimatedValue || 0;
      const gameType = room.gameType || 'rps';

      logger.info(`Starting cycle for room ${roomId}: ${prizeTitle}`);

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

      // presence에서 참가자 수집
      const presenceSnap = await rtdb.ref('rooms/main/presence').get();
      const presenceData = presenceSnap.exists()
        ? (presenceSnap.val() as Record<string, { uid: string; displayName?: string }>)
        : {};
      const presenceUsers = Object.keys(presenceData);

      const participants = presenceUsers.length >= 2
        ? presenceUsers.map((uid) => ({
            uid,
            displayName: presenceData[uid]?.displayName || uid,
            eliminated: false,
            joinedAt: Date.now(),
          }))
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
      const participantUpdates: Record<string, any> = {};
      for (const p of participants) {
        let displayName = p.displayName || p.uid;
        let photoURL: string | null = null;
        if (!p.uid.startsWith('BOT')) {
          try {
            const userRecord = await getAuth().getUser(p.uid);
            displayName = userRecord.displayName || userRecord.email || p.uid;
            photoURL = userRecord.photoURL || null;
          } catch {
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
      await sleep(PHASES[1].duration * 1000);

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

      let winnerId: string | null = null;

      // ═══════════════════════════════════════════════════
      // 새 정규 게임 10종 (커스텀방과 동일, Gemini API 연동)
      // ═══════════════════════════════════════════════════
      type MainGameType =
        | 'drawGuess' | 'lineRunner' | 'liarVote' | 'typingBattle' | 'bombPass'
        | 'priceGuess' | 'oxSurvival' | 'tapSurvival' | 'nunchiGame' | 'quickTouch';

      const GAME_TYPES: MainGameType[] = [
        'drawGuess', 'lineRunner', 'liarVote', 'typingBattle', 'bombPass',
        'priceGuess', 'oxSurvival', 'tapSurvival', 'nunchiGame', 'quickTouch',
      ];

      const GAME_NAMES: Record<MainGameType, string> = {
        drawGuess: '🎨 그림 맞추기',
        lineRunner: '✏️ 라인 러너',
        liarVote: '🕵️ 라이어 투표',
        typingBattle: '⌨️ 타이핑 배틀',
        bombPass: '💣 폭탄 돌리기',
        priceGuess: '💰 가격 맞추기',
        oxSurvival: '⭕ OX 서바이벌',
        tapSurvival: '👆 탭 서바이벌',
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
      const scores: Record<string, number> = {};
      const nameMap: Record<string, string> = {};
      const alive: Record<string, boolean> = {};
      allPlayers.forEach((pid) => { scores[pid] = 0; });
      participants.forEach((p) => {
        nameMap[p.uid] = p.displayName || p.uid.slice(0, 6);
        alive[p.uid] = true;
      });

      // ── Gemini로 라운드 데이터 생성 ──
      const roundsData: Record<string, unknown> = {};
      let gameConfig: Record<string, unknown> = {};

      switch (pickedGameType) {
        case 'drawGuess': {
          const words = await generateDrawWords(TOTAL_ROUNDS);
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
            const obstacles: Array<{ x: number; y: number; w: number; h: number }> = [];
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
        case 'liarVote': {
          for (let r = 1; r <= TOTAL_ROUNDS; r++) {
            const cat = LIAR_WORDS[Math.floor(Math.random() * LIAR_WORDS.length)];
            const realWord = cat.words[Math.floor(Math.random() * cat.words.length)];
            const fakeWord = cat.words.filter((w) => w !== realWord)[Math.floor(Math.random() * (cat.words.length - 1))] || '???';
            const liarIdx = Math.floor(Math.random() * allPlayers.length);
            roundsData[`round${r}`] = {
              round: r,
              category: cat.category,
              realWord,
              fakeWord,
              liarId: allPlayers[liarIdx],
              liarName: nameMap[allPlayers[liarIdx]],
              discussionTime: 30,
              voteTime: 15,
            };
          }
          gameConfig = { type: 'liarVote' };
          break;
        }
        case 'typingBattle': {
          const sentences = await generateTypingSentences(TOTAL_ROUNDS);
          for (let r = 1; r <= TOTAL_ROUNDS; r++) {
            roundsData[`round${r}`] = { round: r, sentence: sentences[r - 1] || `타이핑 테스트 ${r}`, timeLimit: 20 };
          }
          gameConfig = { type: 'typingBattle' };
          break;
        }
        case 'bombPass': {
          const quizzes = await generateBombQuizzes(TOTAL_ROUNDS * 3);
          for (let r = 1; r <= TOTAL_ROUNDS; r++) {
            roundsData[`round${r}`] = {
              round: r,
              quizzes: quizzes.slice((r - 1) * 3, r * 3),
              initialBombHolder: allPlayers[Math.floor(Math.random() * allPlayers.length)],
              fuseTime: Math.max(8, 20 - r),
            };
          }
          gameConfig = { type: 'bombPass' };
          break;
        }
        case 'priceGuess': {
          const items = await generatePriceItems(TOTAL_ROUNDS);
          for (let r = 1; r <= TOTAL_ROUNDS; r++) {
            const item = items[r - 1] || { name: `상품${r}`, price: 10000, hint: '📦', category: '기타' };
            roundsData[`round${r}`] = { round: r, itemName: item.name, actualPrice: item.price, hint: item.hint, category: item.category, timeLimit: 15 };
          }
          gameConfig = { type: 'priceGuess' };
          break;
        }
        case 'oxSurvival': {
          const quizzes = await generateOXQuizzes(TOTAL_ROUNDS);
          for (let r = 1; r <= TOTAL_ROUNDS; r++) {
            const quiz = quizzes[r - 1] || { q: `비상 퀴즈 ${r}`, a: true, explanation: '' };
            roundsData[`round${r}`] = { round: r, question: quiz.q, answer: quiz.a, explanation: quiz.explanation, timeLimit: 10 };
          }
          gameConfig = { type: 'oxSurvival', elimination: true };
          break;
        }
        case 'tapSurvival': {
          for (let r = 1; r <= TOTAL_ROUNDS; r++) {
            roundsData[`round${r}`] = { round: r, duration: 10, eliminatePercent: 30 };
          }
          gameConfig = { type: 'tapSurvival', elimination: true };
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
            const targets: Array<{ x: number; y: number; delay: number; size: number }> = [];
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
          totalRounds: TOTAL_ROUNDS,
          round: 0,
          scores,
          nameMap,
          alive,
          startedAt: Date.now(),
          startedBy: 'SYSTEM',
          config: gameConfig,
        },
        participants: Object.fromEntries(
          participants.map((p) => [
            p.uid,
            { displayName: p.displayName, level: 1, alive: true },
          ])
        ),
        rounds: roundsData,
      });

      await sendBotChat(rtdb, 'main', `🎮 ${GAME_NAMES[pickedGameType]} 시작! ${allPlayers.length}명 참가! ${TOTAL_ROUNDS}라운드!`);

      // ── 클라이언트가 게임을 진행하는 동안 대기 (5분) ──
      await sleep(PHASES[3].duration * 1000);

      // ── 게임 끝난 후 최종 스코어 읽기 ──
      const finalSnap = await rtdb.ref('games/main/current/scores').get();
      const finalScores = finalSnap.exists() ? (finalSnap.val() as Record<string, number>) : scores;
      const sorted = Object.entries(finalScores).sort((a, b) => b[1] - a[1]);
      winnerId = sorted[0]?.[0] || allPlayers[0] || null;

      const finalLeaderboard = sorted.slice(0, 5).map(([pid, s], i) =>
        `${i + 1}위 ${nameMap[pid] || pid}: ${s}점`
      ).join('\n');

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
          const winnerRecord = await getAuth().getUser(winnerId);
          winnerName = winnerRecord.displayName || winnerRecord.email || winnerId;
          winnerPhoto = winnerRecord.photoURL || '';
        } catch {
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
          const winnerRecord = await getAuth().getUser(winnerId);
          winnerName = winnerRecord.displayName || winnerRecord.email || winnerId;
          winnerPhoto = winnerRecord.photoURL || '';
        } catch {
          // BOT이거나 유저 조회 실패 시
          if (winnerId.startsWith('BOT')) {
            winnerName = `봇 ${winnerId}`;
          } else {
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

      logger.info(`Cycle completed for room ${roomId}, winner: ${winnerId}`);
    } catch (error) {
      logger.error('Game cycle error:', error);
      throw error;
    }
  }
);
