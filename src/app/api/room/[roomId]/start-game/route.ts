import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore, adminRealtimeDb } from "@/lib/firebase/admin";
import {
  generatePriceItems,
  generateDrawWords,
  generateTypingSentences,
} from "@/lib/gemini/gameQuiz";

export const dynamic = 'force-dynamic';

// ═══ 새 10종 게임 ═══
type MainGameType =
  | 'drawGuess' | 'flappyBattle' | 'bigRoulette' | 'typingBattle'
  | 'priceGuess' | 'blindAuction' | 'bombSurvival' | 'tetrisBattle'
  | 'memoryMatch' | 'slitherBattle';

const GAME_NAMES: Record<MainGameType, string> = {
  drawGuess: '🎨 그림 맞추기',
  flappyBattle: '🐦 플래피 배틀',
  bigRoulette: '🎰 빅 룰렛',
  typingBattle: '⌨️ 타이핑 레이스',
  priceGuess: '💰 가격을 맞춰라',
  blindAuction: '📦 블라인드 경매',
  bombSurvival: '💣 폭탄 해제',
  tetrisBattle: '🧱 테트리스 배틀',
  memoryMatch: '🃏 메모리 매치',
  slitherBattle: '🐍 스네이크 서바이벌',
};
const VALID_GAMES = Object.keys(GAME_NAMES) as MainGameType[];

function getChestHint(chest: { type: string; points: number; special?: string }, round: number): string {
  const hints: Record<string, string[]> = {
    gold: ["✨ 빛나는 황금 상자", "👑 왕관이 새겨진 상자", "🌟 별빛이 나는 상자"],
    silver: ["🪙 은색 무늬 상자", "⚪ 하얀 빛의 상자"],
    bronze: ["🟤 갈색 상자", "📦 평범해 보이는 상자"],
    tiny: ["🫧 작은 상자", "💧 이슬이 맺힌 상자"],
    empty: ["📦 가벼운 상자", "🫥 텅 빈 느낌의 상자"],
    trap: ["⚠️ 수상한 상자", "🔴 붉은 빛의 상자", "💀 해골 무늬 상자"],
    bomb: ["⚠️ 째깍거리는 상자", "🔴 뜨거운 상자", "💣 위험해 보이는 상자"],
    mirror: ["🪞 반짝이는 상자", "🔮 신비로운 상자"],
    double: ["✨ 쌍둥이 문양 상자", "🎭 두 얼굴의 상자"],
    steal: ["🦊 여우 문양 상자", "🎭 가면 상자"],
  };
  const pool = hints[chest.type] || ["📦 상자"];
  if (round >= 8) return "❓ 알 수 없는 상자";
  return pool[Math.floor(Math.random() * pool.length)];
}

// bombSurvival 퀴즈 폴백 (서버측 gemini 없을 때)
function getFallbackBombQuizzes(count: number) {
  const pool = [
    { q: '대한민국의 수도는?', a: '서울', acceptable: ['서울', '서울특별시'] },
    { q: '1+1=?', a: '2', acceptable: ['2'] },
    { q: '물의 화학식은?', a: 'H2O', acceptable: ['H2O', 'h2o'] },
    { q: '태양계에서 가장 큰 행성은?', a: '목성', acceptable: ['목성', 'jupiter'] },
    { q: '한국의 국화는?', a: '무궁화', acceptable: ['무궁화'] },
    { q: '세계에서 가장 높은 산은?', a: '에베레스트', acceptable: ['에베레스트', '에베레스트산'] },
    { q: '빛의 속도는 초속 약 몇 km?', a: '30만', acceptable: ['30만', '300000', '299792'] },
    { q: 'CSS에서 글자 색을 바꾸는 속성은?', a: 'color', acceptable: ['color'] },
    { q: '대한민국의 화폐 단위는?', a: '원', acceptable: ['원', 'KRW'] },
    { q: '지구에서 달까지 거리는 약 몇 km?', a: '38만', acceptable: ['38만', '384400', '38만km'] },
  ];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminFirestore.collection("users").doc(decoded.uid).get();
    const userData = userDoc.data();
    const isAdminOrMod = !!(userData?.isAdmin || userData?.isModerator);

    if (!isAdminOrMod) {
      const today = new Date().toISOString().slice(0, 10);
      const limitDoc = await adminFirestore
        .collection("users")
        .doc(decoded.uid)
        .collection("gameCreations")
        .doc(today)
        .get();

      if (limitDoc.exists) {
        const data = limitDoc.data();
        if (data && data.count >= 5) {
          return NextResponse.json(
            { error: "일반 유저는 하루 5회까지 게임을 생성할 수 있습니다." },
            { status: 429 }
          );
        }
      }
    }

    const { gameType, rounds: requestedRounds } = (await req.json()) as { gameType?: string; rounds?: number };
    if (!gameType || !VALID_GAMES.includes(gameType as MainGameType)) {
      return NextResponse.json({ error: "유효하지 않은 게임" }, { status: 400 });
    }

    const validRounds = [3, 6, 9];
    const TOTAL_ROUNDS = requestedRounds && validRounds.includes(requestedRounds) ? requestedRounds : 9;

    const presSnap = await adminRealtimeDb.ref(`rooms/${roomId}/presence`).get();
    const presData = presSnap.exists()
      ? (presSnap.val() as Record<string, { uid: string; displayName: string; photoURL?: string | null; level?: number }>)
      : {};
    const players = Object.values(presData);
    if (players.length < 2) {
      return NextResponse.json({ error: "최소 2명 필요" }, { status: 400 });
    }

    const currentSnap = await adminRealtimeDb.ref(`games/${roomId}/current`).get();
    if (currentSnap.exists()) {
      const cur = currentSnap.val() as { phase?: string; startedAt?: number };
      if (cur?.phase && cur.phase !== "idle" && cur.phase !== "final_result") {
        if (Date.now() - (cur.startedAt || 0) < 10 * 60 * 1000) {
          return NextResponse.json({ error: "이미 게임 진행 중" }, { status: 409 });
        }
        await adminRealtimeDb.ref(`games/${roomId}`).remove();
      }
    }

    const gameName = GAME_NAMES[gameType as MainGameType];
    const allPlayerIds = players.map((p) => p.uid);
    const scores: Record<string, number> = {};
    const nameMap: Record<string, string> = {};
    const photoMap: Record<string, string | null> = {};
    const alive: Record<string, boolean> = {};
    for (const p of players) {
      scores[p.uid] = 0;
      nameMap[p.uid] = p.displayName || p.uid.slice(0, 6);
      photoMap[p.uid] = p.photoURL ?? null;
      alive[p.uid] = true;
    }

    const roundsData: Record<string, unknown> = {};
    let gameConfig: Record<string, unknown> = {};
    let chipsToSet: Record<string, number> | null = null;
    let rouletteCoinsToSet: Record<string, number> | null = null;

    switch (gameType) {
      case "drawGuess": {
        const words = await generateDrawWords(TOTAL_ROUNDS);
        const shuffledPlayers = [...allPlayerIds].sort(() => Math.random() - 0.5);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const drawerIdx = (r - 1) % shuffledPlayers.length;
          roundsData[`round${r}`] = {
            round: r, drawerId: shuffledPlayers[drawerIdx],
            drawerName: nameMap[shuffledPlayers[drawerIdx]],
            word: words[r - 1]?.word || "고양이",
            category: words[r - 1]?.category || "기본",
            difficulty: words[r - 1]?.difficulty || "easy",
            timeLimit: 60, guessed: false, gameType: 'drawGuess',
          };
        }
        gameConfig = { type: "drawGuess", needsCanvas: true };
        break;
      }
      case "flappyBattle": {
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          roundsData[`round${r}`] = {
            round: r, speedMultiplier: 1 + r * 0.15, timeLimit: 30, gameType: 'flappyBattle',
          };
        }
        gameConfig = { type: "flappyBattle", needsCanvas: true };
        break;
      }
      case "bigRoulette": {
        const SEGMENTS = [
          { label: "×2", mult: 2, color: "#3b82f6" },
          { label: "×3", mult: 3, color: "#8b5cf6" },
          { label: "×1", mult: 1, color: "#6b7280" },
          { label: "×5", mult: 5, color: "#f59e0b" },
          { label: "×2", mult: 2, color: "#3b82f6" },
          { label: "💀", mult: 0, color: "#ef4444" },
          { label: "×3", mult: 3, color: "#8b5cf6" },
          { label: "×10", mult: 10, color: "#ec4899" },
          { label: "×1", mult: 1, color: "#6b7280" },
          { label: "×2", mult: 2, color: "#3b82f6" },
          { label: "×5", mult: 5, color: "#f59e0b" },
          { label: "×20", mult: 20, color: "#dc2626" },
        ];
        const BASE_COINS = [100, 120, 150, 200, 260, 340, 440, 580, 760, 1000];
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const targetIdx = Math.floor(Math.random() * SEGMENTS.length);
          roundsData[`round${r}`] = {
            round: r, targetSegmentIdx: targetIdx, baseCoins: BASE_COINS[r - 1],
            timeLimit: 15, gameType: 'bigRoulette',
          };
        }
        gameConfig = { type: "bigRoulette", segments: SEGMENTS, startingCoins: 500 };
        const rouletteCoins: Record<string, number> = {};
        for (const p of players) rouletteCoins[p.uid] = 500;
        rouletteCoinsToSet = rouletteCoins;
        break;
      }
      case "typingBattle": {
        const sentences = await generateTypingSentences(TOTAL_ROUNDS);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          roundsData[`round${r}`] = {
            round: r, sentence: sentences[r - 1] || `타이핑 테스트 문장 ${r}번입니다`,
            timeLimit: 20, gameType: 'typingBattle',
          };
        }
        gameConfig = { type: "typingBattle" };
        break;
      }
      case "priceGuess": {
        const items = await generatePriceItems(TOTAL_ROUNDS);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const item = items[r - 1] || { name: `상품${r}`, price: 10000, hint: "📦", category: "기타" };
          roundsData[`round${r}`] = {
            round: r, itemName: item.name, actualPrice: item.price,
            hint: item.hint, category: item.category, timeLimit: 15, gameType: 'priceGuess',
          };
        }
        gameConfig = { type: "priceGuess" };
        break;
      }
      case "blindAuction": {
        const CHEST_POOL = [
          { type: "gold", label: "💎 대박!", points: 30 },
          { type: "silver", label: "🪙 괜찮은 보상", points: 20 },
          { type: "bronze", label: "🥉 소소한 보상", points: 10 },
          { type: "tiny", label: "💧 물방울", points: 5 },
          { type: "empty", label: "📦 빈 상자", points: 0 },
          { type: "trap", label: "💀 함정!", points: -15 },
          { type: "bomb", label: "💣 폭탄!", points: -20 },
          { type: "mirror", label: "🪞 거울 상자", points: 0, special: "mirror" },
          { type: "double", label: "✨ 더블 찬스", points: 0, special: "double" },
          { type: "steal", label: "🦊 도둑 상자", points: 0, special: "steal" },
        ];
        const startingChips = 10;
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const pool =
            r <= 3
              ? CHEST_POOL.filter((c) => !["bomb", "steal", "double"].includes(c.type))
              : r <= 6
                ? CHEST_POOL.filter((c) => c.type !== "double")
                : CHEST_POOL;
          const chest = pool[Math.floor(Math.random() * pool.length)];
          roundsData[`round${r}`] = {
            round: r, chest: { ...chest }, chestHint: getChestHint(chest, r),
            timeLimit: 12, minBid: 1, maxBid: startingChips, gameType: 'blindAuction',
          };
        }
        gameConfig = { type: "blindAuction", startingChips };
        const chips: Record<string, number> = {};
        for (const p of players) chips[p.uid] = startingChips;
        chipsToSet = chips;
        break;
      }
      case "bombSurvival": {
        const quizzes = getFallbackBombQuizzes(TOTAL_ROUNDS);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const quiz = quizzes[r - 1] || { q: '1+1=?', a: '2', acceptable: ['2'] };
          roundsData[`round${r}`] = {
            round: r, question: quiz.q, answer: quiz.a,
            acceptable: quiz.acceptable, timeLimit: 12, gameType: 'bombSurvival',
          };
        }
        gameConfig = { type: "bombSurvival" };
        break;
      }
      case "tetrisBattle": {
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          roundsData[`round${r}`] = {
            round: r, timeLimit: 30,
            targetLines: 3 + Math.floor(r / 3),
            speed: Math.max(200, 500 - r * 30),
            gameType: 'tetrisBattle',
          };
        }
        gameConfig = { type: "tetrisBattle" };
        break;
      }
      case "memoryMatch": {
        const EMOJI_POOL = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐸','🐵','🐔','🐧','🦁','🐮','🐷','🐙'];
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const gridSize = r <= 5 ? 4 : 6;
          const pairsNeeded = (gridSize * gridSize) / 2;
          const shuffled = [...EMOJI_POOL].sort(() => Math.random() - 0.5).slice(0, pairsNeeded);
          const cards = [...shuffled, ...shuffled].sort(() => Math.random() - 0.5);
          roundsData[`round${r}`] = {
            round: r, gridSize, cards,
            timeLimit: gridSize === 4 ? 20 : 35,
            gameType: 'memoryMatch',
          };
        }
        gameConfig = { type: "memoryMatch" };
        break;
      }
      case "slitherBattle": {
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const foods: Array<{ x: number; y: number }> = [];
          const gridCells = 20;
          for (let i = 0; i < 5 + r; i++) {
            foods.push({
              x: Math.floor(Math.random() * gridCells),
              y: Math.floor(Math.random() * gridCells),
            });
          }
          roundsData[`round${r}`] = {
            round: r, initialFoods: foods, timeLimit: 20,
            gridSize: gridCells, gameType: 'slitherBattle',
          };
        }
        gameConfig = { type: "slitherBattle" };
        break;
      }
    }

    const totalRoundsForGame = TOTAL_ROUNDS;

    await adminRealtimeDb.ref(`games/${roomId}`).set({
      current: {
        gameType,
        gameName,
        phase: "game_intro",
        introStartedAt: Date.now(),
        totalPlayers: allPlayerIds.length,
        totalRounds: totalRoundsForGame,
        round: 0,
        scores,
        nameMap,
        photoMap,
        alive,
        startedAt: Date.now(),
        startedBy: decoded.uid,
        config: gameConfig,
      },
      participants: Object.fromEntries(
        players.map((p) => [p.uid, { displayName: p.displayName, level: p.level || 1, alive: true }])
      ),
      rounds: roundsData,
    });

    if (chipsToSet) {
      await adminRealtimeDb.ref(`games/${roomId}/chips`).set(chipsToSet);
    }
    if (rouletteCoinsToSet) {
      await adminRealtimeDb.ref(`games/${roomId}/rouletteCoins`).set(rouletteCoinsToSet);
    }

    // ── ★★★ 3초 후 1라운드 자동 시작 ★★★ ──
    const firstRoundData = roundsData['round1'] as { timeLimit?: number } | undefined;
    const firstTimeLimit = firstRoundData?.timeLimit ?? 15;

    await new Promise((r) => setTimeout(r, 3000));

    const initialActions: Record<string, { done: boolean; score: number }> = {};
    for (const pid of allPlayerIds) {
      initialActions[pid] = { done: false, score: 0 };
    }

    const roundStartTime = Date.now();
    await adminRealtimeDb.ref(`games/${roomId}/current`).update({
      phase: 'playing',
      round: 1,
      roundStartedAt: roundStartTime,
      roundEndsAt: roundStartTime + firstTimeLimit * 1000,
    });
    await adminRealtimeDb.ref(`games/${roomId}/roundActions/round1`).set(initialActions);

    const gamePresenceInit: Record<string, { online: boolean; lastSeen: number; currentRound: number }> = {};
    for (const pid of allPlayerIds) {
      gamePresenceInit[pid] = { online: true, lastSeen: Date.now(), currentRound: 1 };
    }
    await adminRealtimeDb.ref(`games/${roomId}/presence`).set(gamePresenceInit);

    if (!isAdminOrMod) {
      const today = new Date().toISOString().slice(0, 10);
      const limitRef = adminFirestore
        .collection("users")
        .doc(decoded.uid)
        .collection("gameCreations")
        .doc(today);
      const limitDoc = await limitRef.get();
      if (limitDoc.exists) {
        await limitRef.update({ count: (limitDoc.data()?.count || 0) + 1 });
      } else {
        await limitRef.set({ count: 1, date: today });
      }
    }

    await adminRealtimeDb.ref(`chat/${roomId}/messages`).push({
      uid: "BOT_HOST",
      displayName: "🎪 방장봇",
      message: `🎮 ${gameName} 시작! ${allPlayerIds.length}명 참가! ${totalRoundsForGame}라운드!`,
      timestamp: Date.now(),
      isBot: true,
      isSystem: false,
      type: "bot",
    });

    return NextResponse.json({
      success: true,
      gameName,
      gameType,
      totalPlayers: allPlayerIds.length,
      totalRounds: totalRoundsForGame,
    });
  } catch (error) {
    console.error("Start game error:", error);
    return NextResponse.json({ error: "게임 시작 실패" }, { status: 500 });
  }
}
