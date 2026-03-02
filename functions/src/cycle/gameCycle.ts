// functions/src/cycle/gameCycle.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { logger } from 'firebase-functions';

const PHASES = [
  { phase: 'ANNOUNCING', duration: 30 },
  { phase: 'ENTRY_GATE', duration: 60 },
  { phase: 'GAME_LOBBY', duration: 30 },
  { phase: 'GAME_COUNTDOWN', duration: 5 },
  { phase: 'GAME_PLAYING', duration: 300 },
  { phase: 'GAME_RESULT', duration: 15 },
  { phase: 'WINNER_ANNOUNCE', duration: 30 },
  { phase: 'COOLDOWN', duration: 30 },
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
      const slotQuery = await db
        .collection('scheduleSlots')
        .where('enabled', '==', true)
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
      const participantUpdates: Record<string, any> = {};
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

      // ── Phase 5: GAME_PLAYING (게임 타입별 분기) ──
      phaseStart = Date.now();
      phaseEnd = phaseStart + PHASES[4].duration * 1000;
      await rtdb.ref('cycle/main').update({
        currentPhase: 'GAME_PLAYING',
        phaseStartedAt: phaseStart,
        phaseEndsAt: phaseEnd,
      });

      let winnerId: string | null = null;

      if (gameType === 'rps') {
        // ── 가위바위보 토너먼트 ──
        let alivePlayers = participants.map((p) => p.uid);
        let roundNumber = 0;
        const maxRounds = Math.ceil(Math.log2(participants.length)) + 2;

        while (alivePlayers.length > 1 && roundNumber < maxRounds) {
          roundNumber++;
          const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
          const matchups: Array<{ matchId: string; p1: string; p2: string }> = [];
          for (let i = 0; i < shuffled.length; i += 2) {
            matchups.push({ matchId: generateId(), p1: shuffled[i], p2: shuffled[i + 1] || 'BOT_AUTO' });
          }

          await rtdb.ref(`games/main/current`).update({
            phase: 'playing', currentRound: roundNumber,
            roundStartedAt: Date.now(), roundEndsAt: Date.now() + 5000, countdown: 5,
          });
          for (const m of matchups) {
            await rtdb.ref(`games/main/playerMatch/${m.p1}`).set({ matchId: m.matchId, opponentId: m.p2 });
            if (!m.p2.startsWith('BOT')) {
              await rtdb.ref(`games/main/playerMatch/${m.p2}`).set({ matchId: m.matchId, opponentId: m.p1 });
            }
          }
          await sleep(5000);

          const choices = ['rock', 'paper', 'scissors'] as const;
          const roundWinners: string[] = [];
          const matchResults: Record<string, any> = {};
          for (const m of matchups) {
            const p1Snap = await rtdb.ref(`games/main/choices/${m.matchId}/${m.p1}`).get();
            const p2Snap = await rtdb.ref(`games/main/choices/${m.matchId}/${m.p2}`).get();
            const p1Choice = p1Snap.exists() ? p1Snap.val() : choices[Math.floor(Math.random() * 3)];
            const p2Choice = p2Snap.exists() ? p2Snap.val() : choices[Math.floor(Math.random() * 3)];
            let winner: string;
            if (p1Choice === p2Choice) { winner = Math.random() > 0.5 ? m.p1 : m.p2; }
            else if ((p1Choice === 'rock' && p2Choice === 'scissors') || (p1Choice === 'scissors' && p2Choice === 'paper') || (p1Choice === 'paper' && p2Choice === 'rock')) { winner = m.p1; }
            else { winner = m.p2; }
            roundWinners.push(winner);
            matchResults[m.matchId] = { player1: { id: m.p1, choice: p1Choice }, player2: { id: m.p2, choice: p2Choice }, winnerId: winner };
          }
          await rtdb.ref(`games/main/current`).update({ phase: 'round_result', matchResults });
          for (const p of alivePlayers) {
            if (!roundWinners.includes(p)) {
              await rtdb.ref(`games/main/participants/${p}`).update({ alive: false, eliminatedRound: roundNumber });
            }
          }
          alivePlayers = roundWinners;
          await sendBotChat(rtdb, 'main', `⚔️ 라운드 ${roundNumber} 완료! ${alivePlayers.length}명 생존!`);
          await sleep(3000);
        }
        winnerId = alivePlayers[0] || null;

      } else if (gameType === 'roulette') {
        // ── 룰렛: 참가자 중 랜덤 1명 선택 ──
        await rtdb.ref(`games/main/current`).update({ phase: 'playing', currentRound: 1 });
        await sendBotChat(rtdb, 'main', '🎰 룰렛을 돌립니다!');
        await sleep(3000);
        
        const playerIds = participants.map((p) => p.uid);
        const winnerIndex = Math.floor(Math.random() * playerIds.length);
        winnerId = playerIds[winnerIndex];
        
        // 결과를 Realtime DB에 기록
        await rtdb.ref(`games/main/current`).update({
          phase: 'round_result',
          rouletteResult: { winnerId, winnerIndex, totalPlayers: playerIds.length },
        });
        await sendBotChat(rtdb, 'main', `🎰 룰렛 결과 발표!`);
        await sleep(5000);

      } else if (gameType === 'oxQuiz') {
        // ── OX퀴즈: 3문제, 틀리면 탈락 ──
        const quizQuestions = [
          { question: '대한민국의 수도는 서울이다', answer: true },
          { question: '지구에서 가장 큰 대양은 대서양이다', answer: false },
          { question: '1+1=2이다', answer: true },
          { question: '빛의 속도는 소리의 속도보다 느리다', answer: false },
          { question: '물의 화학식은 H2O이다', answer: true },
        ];
        
        let alivePlayers = participants.map((p) => p.uid);
        const totalQuestions = Math.min(3, quizQuestions.length);
        
        for (let q = 0; q < totalQuestions && alivePlayers.length > 1; q++) {
          const quiz = quizQuestions[q];
          await rtdb.ref(`games/main/current`).update({
            phase: 'playing', currentRound: q + 1,
            quiz: { question: quiz.question, questionNumber: q + 1, totalQuestions },
          });
          await sendBotChat(rtdb, 'main', `❓ Q${q + 1}. ${quiz.question}`);
          await sleep(10000); // 10초 답변 시간

          // 답변 수집
          const survivors: string[] = [];
          for (const uid of alivePlayers) {
            const answerSnap = await rtdb.ref(`games/main/answers/${q + 1}/${uid}`).get();
            const userAnswer = answerSnap.exists() ? answerSnap.val() : (Math.random() > 0.5); // 봇은 랜덤
            if (userAnswer === quiz.answer) {
              survivors.push(uid);
            } else {
              await rtdb.ref(`games/main/participants/${uid}`).update({ alive: false, eliminatedRound: q + 1 });
            }
          }
          
          await rtdb.ref(`games/main/current`).update({
            phase: 'round_result',
            quizResult: { answer: quiz.answer, survivors: survivors.length, eliminated: alivePlayers.length - survivors.length },
          });
          
          const answerText = quiz.answer ? '⭕ O' : '❌ X';
          await sendBotChat(rtdb, 'main', `정답은 ${answerText}! ${survivors.length}명 생존, ${alivePlayers.length - survivors.length}명 탈락!`);
          alivePlayers = survivors;
          await sleep(3000);
        }
        
        if (alivePlayers.length > 1) {
          winnerId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        } else {
          winnerId = alivePlayers[0] || null;
        }

      } else if (gameType === 'numberGuess') {
        // ── 숫자맞추기: 1~100 중 가장 가까운 사람 승리 ──
        const targetNumber = Math.floor(Math.random() * 100) + 1;
        
        await rtdb.ref(`games/main/current`).update({
          phase: 'playing', currentRound: 1,
          numberGuess: { min: 1, max: 100 },
        });
        await sendBotChat(rtdb, 'main', '🔢 1~100 사이의 숫자를 맞춰보세요! (10초)');
        await sleep(10000);

        let closestPlayer: string | null = null;
        let closestDiff = Infinity;
        
        for (const p of participants) {
          const guessSnap = await rtdb.ref(`games/main/guesses/${p.uid}`).get();
          const guess = guessSnap.exists() ? Number(guessSnap.val()) : Math.floor(Math.random() * 100) + 1;
          const diff = Math.abs(guess - targetNumber);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestPlayer = p.uid;
          }
        }
        
        winnerId = closestPlayer;
        await rtdb.ref(`games/main/current`).update({
          phase: 'round_result',
          numberResult: { target: targetNumber, winnerId },
        });
        await sendBotChat(rtdb, 'main', `🔢 정답은 ${targetNumber}! 가장 가까운 사람이 승리!`);
        await sleep(5000);

      } else if (gameType === 'speedClick') {
        // ── 빠른클릭: 10초간 가장 많이 클릭한 사람 승리 ──
        await rtdb.ref(`games/main/current`).update({
          phase: 'playing', currentRound: 1,
          speedClick: { duration: 10 },
        });
        await sendBotChat(rtdb, 'main', '👆 10초간 최대한 빠르게 클릭하세요!');
        await sleep(10000);

        let maxClicks = 0;
        let topClicker: string | null = null;
        
        for (const p of participants) {
          const clickSnap = await rtdb.ref(`games/main/clicks/${p.uid}`).get();
          const clicks = clickSnap.exists() ? Number(clickSnap.val()) : Math.floor(Math.random() * 50) + 10;
          if (clicks > maxClicks) {
            maxClicks = clicks;
            topClicker = p.uid;
          }
        }
        
        winnerId = topClicker;
        await rtdb.ref(`games/main/current`).update({
          phase: 'round_result',
          speedResult: { winnerId, maxClicks },
        });
        await sendBotChat(rtdb, 'main', `👆 최다 클릭: ${maxClicks}회!`);
        await sleep(5000);

      } else {
        // 기본: 랜덤 선택
        const playerIds = participants.map((p) => p.uid);
        winnerId = playerIds[Math.floor(Math.random() * playerIds.length)];
        await sleep(5000);
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

      logger.info(`Cycle completed for room ${roomId}, winner: ${winnerId}`);
    } catch (error) {
      logger.error('Game cycle error:', error);
      throw error;
    }
  }
);
