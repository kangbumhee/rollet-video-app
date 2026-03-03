import { NextRequest, NextResponse } from "next/server";
import { adminFirestore, adminRealtimeDb } from "@/lib/firebase/admin";
import {
  generateOXQuizzes,
  generatePriceItems,
  generateBombQuizzes,
  generateDrawWords,
  generateTypingSentences,
} from "@/lib/gemini/gameQuiz";

const GAME_LIST = [
  { id: "drawGuess", name: "🎨 그림 맞추기" },
  { id: "liarVote", name: "🕵️ 라이어 투표" },
  { id: "typingBattle", name: "⌨️ 타이핑 배틀" },
  { id: "bombPass", name: "💣 폭탄 돌리기" },
  { id: "priceGuess", name: "💰 가격 맞추기" },
  { id: "oxSurvival", name: "⭕ OX 서바이벌" },
  { id: "tapSurvival", name: "👆 탭 서바이벌" },
  { id: "nunchiGame", name: "👀 눈치 게임" },
  { id: "quickTouch", name: "🎯 순발력 터치" },
  { id: "lineRunner", name: "✏️ 라인 러너" },
];

const LIAR_WORDS = [
  { category: "음식", words: ["떡볶이", "김치찌개", "치킨", "삼겹살", "비빔밥", "짜장면", "떡국", "불고기", "냉면", "김밥"] },
  { category: "동물", words: ["고양이", "강아지", "펭귄", "코끼리", "기린", "사자", "토끼", "햄스터", "돌고래", "앵무새"] },
  { category: "장소", words: ["학교", "편의점", "놀이공원", "병원", "도서관", "영화관", "공항", "수영장", "카페", "지하철"] },
  { category: "직업", words: ["의사", "소방관", "요리사", "경찰", "선생님", "가수", "과학자", "운동선수", "화가", "우주비행사"] },
  { category: "사물", words: ["우산", "냉장고", "스마트폰", "자전거", "안경", "시계", "가방", "신발", "텔레비전", "에어컨"] },
];

function getNextHalfHour(): number {
  const now = new Date();
  const ms = now.getTime();
  const min = now.getMinutes();
  const sec = now.getSeconds();
  const msec = now.getMilliseconds();

  let nextMin: number;
  if (min < 30) {
    nextMin = 30;
  } else {
    nextMin = 60;
  }
  let diffMs = (nextMin - min) * 60 * 1000 - sec * 1000 - msec;

  // 5분 미만 남았으면 그 다음 30분 단위로
  if (diffMs < 5 * 60 * 1000) {
    diffMs += 30 * 60 * 1000;
  }

  return ms + diffMs;
}

async function scheduleNextGame(roomId: string) {
  const nextGameAt = getNextHalfHour();

  // 경품 게임이 다음 포인트 게임보다 먼저 예정되어 있으면 스케줄 안 함
  try {
    const prizeSnap = await adminFirestore
      .collection("scheduleSlots")
      .where("status", "==", "ASSIGNED")
      .where("scheduledAt", ">", Date.now())
      .orderBy("scheduledAt", "asc")
      .limit(1)
      .get();

    if (!prizeSnap.empty) {
      const prizeTime = prizeSnap.docs[0].data().scheduledAt as number;
      if (nextGameAt >= prizeTime) {
        await adminRealtimeDb.ref(`rooms/${roomId}/autoGame`).remove();
        return;
      }
    }
  } catch (err) {
    console.error("[scheduleNextGame] Prize check failed:", err);
  }

  const nextGame = GAME_LIST[Math.floor(Math.random() * GAME_LIST.length)];
  await adminRealtimeDb.ref(`rooms/${roomId}/autoGame`).set({
    nextGameAt,
    nextGameType: nextGame.id,
    nextGameName: nextGame.name,
    reward: { type: "point", amount: 100, label: "100 포인트" },
  });
}

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params;

    const { secret } = (await req.json()) as { secret?: string };
    const AUTO_GAME_SECRET = process.env.AUTO_GAME_SECRET || "auto-game-secret-key";
    if (secret !== AUTO_GAME_SECRET) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    // 경품 사이클 진행 중이면 자동 게임 시작 안 함
    const cycleSnap = await adminRealtimeDb.ref("cycle/main/currentPhase").get();
    const currentPhase = cycleSnap.exists() ? cycleSnap.val() : "IDLE";
    if (currentPhase !== "IDLE" && currentPhase !== "COOLDOWN") {
      await scheduleNextGame(roomId);
      return NextResponse.json({ skipped: true, reason: "경품 게임 진행 중" });
    }

    const currentSnap = await adminRealtimeDb.ref(`games/${roomId}/current`).get();
    if (currentSnap.exists()) {
      const cur = currentSnap.val() as { phase?: string; startedAt?: number };
      if (cur?.phase && cur.phase !== "idle" && cur.phase !== "final_result") {
        if (Date.now() - (cur.startedAt || 0) < 10 * 60 * 1000) {
          return NextResponse.json({ error: "이미 게임 진행 중" }, { status: 409 });
        }
      }
      await adminRealtimeDb.ref(`games/${roomId}`).remove();
    }

    const presSnap = await adminRealtimeDb.ref(`rooms/${roomId}/presence`).get();
    const presData = presSnap.exists()
      ? (presSnap.val() as Record<string, { uid: string; displayName: string; level?: number }>)
      : {};
    const players = Object.values(presData);
    if (players.length < 2) {
      await scheduleNextGame(roomId);
      return NextResponse.json({ skipped: true, reason: "참가자 부족", nextGame: "30분 후" });
    }

    const game = GAME_LIST[Math.floor(Math.random() * GAME_LIST.length)];
    const gameType = game.id;
    const gameName = game.name;
    const TOTAL_ROUNDS = 10;

    const allPlayerIds = players.map((p) => p.uid);
    const scores: Record<string, number> = {};
    const nameMap: Record<string, string> = {};
    const alive: Record<string, boolean> = {};
    for (const p of players) {
      scores[p.uid] = 0;
      nameMap[p.uid] = p.displayName || p.uid.slice(0, 6);
      alive[p.uid] = true;
    }

    const roundsData: Record<string, unknown> = {};
    let gameConfig: Record<string, unknown> = {};

    switch (gameType) {
      case "drawGuess": {
        const words = await generateDrawWords(TOTAL_ROUNDS);
        const shuffled = [...allPlayerIds].sort(() => Math.random() - 0.5);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          roundsData[`round${r}`] = {
            round: r,
            drawerId: shuffled[(r - 1) % shuffled.length],
            drawerName: nameMap[shuffled[(r - 1) % shuffled.length]],
            word: words[r - 1]?.word || "고양이",
            category: words[r - 1]?.category || "기본",
            difficulty: words[r - 1]?.difficulty || "easy",
            timeLimit: 60,
            guessed: false,
          };
        }
        gameConfig = { type: "drawGuess", needsCanvas: true };
        break;
      }
      case "lineRunner": {
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
        gameConfig = { type: "lineRunner", needsCanvas: true };
        break;
      }
      case "liarVote": {
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const cat = LIAR_WORDS[Math.floor(Math.random() * LIAR_WORDS.length)];
          const realWord = cat.words[Math.floor(Math.random() * cat.words.length)];
          const fakeWord = cat.words.filter((w) => w !== realWord)[Math.floor(Math.random() * (cat.words.length - 1))] || "???";
          const liarIdx = Math.floor(Math.random() * allPlayerIds.length);
          roundsData[`round${r}`] = {
            round: r,
            category: cat.category,
            realWord,
            fakeWord,
            liarId: allPlayerIds[liarIdx],
            liarName: nameMap[allPlayerIds[liarIdx]],
            discussionTime: 30,
            voteTime: 15,
          };
        }
        gameConfig = { type: "liarVote" };
        break;
      }
      case "typingBattle": {
        const sentences = await generateTypingSentences(TOTAL_ROUNDS);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          roundsData[`round${r}`] = { round: r, sentence: sentences[r - 1] || `타이핑 테스트 ${r}`, timeLimit: 20 };
        }
        gameConfig = { type: "typingBattle" };
        break;
      }
      case "bombPass": {
        const quizzes = await generateBombQuizzes(TOTAL_ROUNDS * 3);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          roundsData[`round${r}`] = {
            round: r,
            quizzes: quizzes.slice((r - 1) * 3, r * 3),
            initialBombHolder: allPlayerIds[Math.floor(Math.random() * allPlayerIds.length)],
            fuseTime: Math.max(8, 20 - r),
          };
        }
        gameConfig = { type: "bombPass" };
        break;
      }
      case "priceGuess": {
        const items = await generatePriceItems(TOTAL_ROUNDS);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const item = items[r - 1] || { name: `상품${r}`, price: 10000, hint: "📦", category: "기타" };
          roundsData[`round${r}`] = { round: r, itemName: item.name, actualPrice: item.price, hint: item.hint, category: item.category, timeLimit: 15 };
        }
        gameConfig = { type: "priceGuess" };
        break;
      }
      case "oxSurvival": {
        const quizzes = await generateOXQuizzes(TOTAL_ROUNDS);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const quiz = quizzes[r - 1] || { q: `퀴즈 ${r}`, a: true, explanation: "" };
          roundsData[`round${r}`] = { round: r, question: quiz.q, answer: quiz.a, explanation: quiz.explanation, timeLimit: 10 };
        }
        gameConfig = { type: "oxSurvival", elimination: true };
        break;
      }
      case "tapSurvival": {
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          roundsData[`round${r}`] = { round: r, duration: 10, eliminatePercent: 30 };
        }
        gameConfig = { type: "tapSurvival", elimination: true };
        break;
      }
      case "nunchiGame": {
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          roundsData[`round${r}`] = { round: r, maxNumber: Math.max(3, allPlayerIds.length - r + 1), timeLimit: 15 };
        }
        gameConfig = { type: "nunchiGame", elimination: true };
        break;
      }
      case "quickTouch": {
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
        gameConfig = { type: "quickTouch" };
        break;
      }
    }

    await adminRealtimeDb.ref(`games/${roomId}`).set({
      current: {
        gameType,
        gameName,
        phase: "game_intro",
        introStartedAt: Date.now(),
        totalPlayers: allPlayerIds.length,
        totalRounds: TOTAL_ROUNDS,
        round: 0,
        scores,
        nameMap,
        alive,
        startedAt: Date.now(),
        startedBy: allPlayerIds[0],
        isAutoGame: true,
        reward: { type: "point", amount: 100, label: "100 포인트" },
        config: gameConfig,
      },
      participants: Object.fromEntries(
        players.map((p) => [p.uid, { displayName: p.displayName, level: p.level || 1, alive: true }])
      ),
      rounds: roundsData,
    });

    await adminRealtimeDb.ref(`chat/${roomId}/messages`).push({
      uid: "BOT_HOST",
      displayName: "🤖 자동게임봇",
      message: `🎮 자동 게임 시작! ${gameName} | ${allPlayerIds.length}명 참가 | 🏆 1등 보상: 100 포인트`,
      timestamp: Date.now(),
      isBot: true,
      isSystem: false,
      type: "bot",
    });

    await scheduleNextGame(roomId);

    return NextResponse.json({ success: true, gameName, gameType, totalPlayers: allPlayerIds.length });
  } catch (error) {
    console.error("Auto game error:", error);
    return NextResponse.json({ error: "자동 게임 시작 실패" }, { status: 500 });
  }
}
