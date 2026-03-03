import { NextRequest, NextResponse } from "next/server";
import { adminFirestore, adminRealtimeDb, verifyAuth } from "@/lib/firebase/admin";
import {
  generateOXQuizzes,
  generatePriceItems,
  generateDrawWords,
  generateTypingSentences,
} from "@/lib/gemini/gameQuiz";

const GAME_LIST = [
  { id: "drawGuess", name: "🎨 그림 맞추기" },
  { id: "bigRoulette", name: "🎰 빅 룰렛" },
  { id: "typingBattle", name: "⌨️ 타이핑 배틀" },
  { id: "weaponForge", name: "⚔️ 무기 강화 대전" },
  { id: "priceGuess", name: "💰 가격 맞추기" },
  { id: "oxSurvival", name: "⭕ OX 서바이벌" },
  { id: "destinyAuction", name: "🎰 운명의 경매" },
  { id: "nunchiGame", name: "👀 눈치 게임" },
  { id: "quickTouch", name: "🎯 순발력 터치" },
  { id: "lineRunner", name: "✏️ 라인 러너" },
];

function getChestHint(
  chest: { type: string; points: number; special?: string },
  round: number
): string {
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
    phase: "waiting",
    nextGameAt,
    nextGameType: nextGame.id,
    nextGameName: nextGame.name,
    reward: { type: "point", amount: 100, label: "100 포인트" },
  });
}

type AutoGameData = {
  phase?: string;
  nextGameAt?: number;
  nextGameType?: string;
  nextGameName?: string;
  reward?: { type: string; amount: number; label: string };
  recruitingUntil?: number;
  joinedPlayers?: Record<string, { displayName: string; joinedAt: number }>;
};

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params;
    const body = (await req.json()) as { secret?: string; action?: string };
    const { secret, action } = body;
    const AUTO_GAME_SECRET = process.env.AUTO_GAME_SECRET || "auto-game-secret-key";

    if (!action || !["recruit", "join", "start"].includes(action)) {
      return NextResponse.json({ error: "action(recruit|join|start) 필요" }, { status: 400 });
    }

    // ── action: recruit ──
    if (action === "recruit") {
      if (secret !== AUTO_GAME_SECRET) {
        return NextResponse.json({ error: "권한 없음" }, { status: 403 });
      }
      const cycleSnap = await adminRealtimeDb.ref("cycle/main/currentPhase").get();
      const currentPhase = cycleSnap.exists() ? cycleSnap.val() : "IDLE";
      if (currentPhase !== "IDLE" && currentPhase !== "COOLDOWN") {
        await scheduleNextGame(roomId);
        return NextResponse.json({ skipped: true, reason: "경품 게임 진행 중" });
      }
      const autoRef = adminRealtimeDb.ref(`rooms/${roomId}/autoGame`);
      const recruitingUntil = Date.now() + 30000;
      await autoRef.update({
        phase: "recruiting",
        recruitingUntil,
        joinedPlayers: {} as Record<string, { displayName: string; joinedAt: number }>,
      });
      return NextResponse.json({ success: true, phase: "recruiting", recruitingUntil });
    }

    // ── action: join ──
    if (action === "join") {
      const decoded = await verifyAuth(req);
      if (!decoded) {
        return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
      }
      const userDoc = await adminFirestore.doc(`users/${decoded.uid}`).get();
      const displayName = userDoc.exists
        ? (userDoc.data()?.displayName as string) || decoded.uid.slice(0, 8)
        : decoded.uid.slice(0, 8);
      const autoRef = adminRealtimeDb.ref(`rooms/${roomId}/autoGame`);
      const snap = await autoRef.get();
      const data = (snap.exists() ? snap.val() : null) as AutoGameData | null;
      if (!data || data.phase !== "recruiting") {
        return NextResponse.json({ error: "모집 중이 아닙니다" }, { status: 400 });
      }
      const joinedPlayers = {
        ...(data.joinedPlayers || {}),
        [decoded.uid]: { displayName, joinedAt: Date.now() },
      };
      await autoRef.update({ joinedPlayers });
      return NextResponse.json({ success: true });
    }

    // ── action: start ──
    if (action === "start") {
      if (secret !== AUTO_GAME_SECRET) {
        return NextResponse.json({ error: "권한 없음" }, { status: 403 });
      }
      const autoRef = adminRealtimeDb.ref(`rooms/${roomId}/autoGame`);
      const autoSnap = await autoRef.get();
      const autoData = (autoSnap.exists() ? autoSnap.val() : null) as AutoGameData | null;

      if (!autoData || autoData.phase !== "recruiting") {
        return NextResponse.json({ success: true, alreadyStarted: true });
      }

      const joinedPlayers = autoData.joinedPlayers || {};
      const playerEntries = Object.entries(joinedPlayers);
      if (playerEntries.length < 2) {
        await scheduleNextGame(roomId);
        return NextResponse.json({ skipped: true, reason: "참가자 부족", nextGame: "다음 30분 단위" });
      }

      await autoRef.update({ phase: "starting" });

      const players = playerEntries.map(([uid, d]) => ({ uid, displayName: d.displayName, level: 1 }));
      const allPlayerIds = players.map((p) => p.uid);

      const SOLO_FRIENDLY_GAMES = ["oxSurvival", "typingBattle", "priceGuess", "quickTouch", "destinyAuction", "lineRunner"];
      let finalGameType = autoData?.nextGameType ?? GAME_LIST[0].id;
      let finalGameName = autoData?.nextGameName ?? GAME_LIST[0].name;
      if (players.length === 1 && !SOLO_FRIENDLY_GAMES.includes(finalGameType)) {
        const soloGame = GAME_LIST.find((g) => SOLO_FRIENDLY_GAMES.includes(g.id)) ?? GAME_LIST[0];
        finalGameType = soloGame.id;
        finalGameName = soloGame.name;
      }

      const TOTAL_ROUNDS = 10;

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
    const presVal = presSnap.exists() ? (presSnap.val() as Record<string, { photoURL?: string | null }>) : {};
    const scores: Record<string, number> = {};
    const nameMap: Record<string, string> = {};
    const photoMap: Record<string, string | null> = {};
    const alive: Record<string, boolean> = {};
    for (const p of players) {
      scores[p.uid] = 0;
      nameMap[p.uid] = p.displayName || p.uid.slice(0, 6);
      photoMap[p.uid] = presVal[p.uid]?.photoURL ?? null;
      alive[p.uid] = true;
    }

    const roundsData: Record<string, unknown> = {};
    let gameConfig: Record<string, unknown> = {};
    let chipsToSet: Record<string, number> | null = null;
    let rouletteCoinsToSet: Record<string, number> | null = null;
    const totalRoundsForGame = TOTAL_ROUNDS;

    switch (finalGameType) {
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
            round: r,
            targetSegmentIdx: targetIdx,
            baseCoins: BASE_COINS[r - 1],
            timeLimit: 15,
          };
        }
        gameConfig = { type: "bigRoulette", segments: SEGMENTS, startingCoins: 500 };
        rouletteCoinsToSet = {};
        for (const pid of allPlayerIds) rouletteCoinsToSet[pid] = 500;
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
      case "weaponForge": {
        const WEAPONS = [
          { id: "longsword", name: "롱소드", emoji: "⚔️", rarity: "common" },
          { id: "dagger", name: "단검", emoji: "🗡️", rarity: "common" },
          { id: "knife", name: "칼", emoji: "🔪", rarity: "common" },
          { id: "dualBlade", name: "이도류", emoji: "⚔️", rarity: "rare" },
          { id: "greatsword", name: "대검", emoji: "🗡️", rarity: "rare" },
          { id: "bow", name: "활", emoji: "🏹", rarity: "common" },
          { id: "spear", name: "창", emoji: "🔱", rarity: "rare" },
          { id: "battleaxe", name: "전투도끼", emoji: "⛏️", rarity: "rare" },
          { id: "staff", name: "지팡이", emoji: "🪄", rarity: "epic" },
          { id: "combatsword", name: "전투검", emoji: "🛡️", rarity: "common" },
          { id: "crossbow", name: "쇠뇌", emoji: "🔫", rarity: "rare" },
          { id: "halberd", name: "할버드", emoji: "🪓", rarity: "epic" },
          { id: "demonsword", name: "마검", emoji: "💎", rarity: "legendary" },
          { id: "moonblade", name: "월광검", emoji: "🌙", rarity: "legendary" },
          { id: "meteorsword", name: "운석검", emoji: "☄️", rarity: "legendary" },
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
        gameConfig = { type: "weaponForge" };
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
      case "destinyAuction": {
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
            round: r,
            chest: { ...chest },
            chestHint: getChestHint(chest, r),
            timeLimit: 12,
            minBid: 1,
            maxBid: startingChips,
          };
        }
        gameConfig = { type: "destinyAuction", startingChips };
        const chips: Record<string, number> = {};
        for (const p of players) {
          chips[p.uid] = startingChips;
        }
        chipsToSet = chips;
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
        gameType: finalGameType,
        gameName: finalGameName,
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

    if (chipsToSet) {
      await adminRealtimeDb.ref(`games/${roomId}/chips`).set(chipsToSet);
    }
    if (rouletteCoinsToSet) {
      await adminRealtimeDb.ref(`games/${roomId}/rouletteCoins`).set(rouletteCoinsToSet);
    }

    await adminRealtimeDb.ref(`chat/${roomId}/messages`).push({
      uid: "BOT_HOST",
      displayName: "🤖 자동게임봇",
      message: `🎮 자동 게임 시작! ${finalGameName} | ${allPlayerIds.length}명 참가 | 🏆 1등 보상: 100 포인트`,
      timestamp: Date.now(),
      isBot: true,
      isSystem: false,
      type: "bot",
    });

    await scheduleNextGame(roomId);

    return NextResponse.json({ success: true, gameName: finalGameName, gameType: finalGameType, totalPlayers: allPlayerIds.length });
    }

  } catch (error) {
    console.error("Auto game error:", error);
    return NextResponse.json({ error: "자동 게임 시작 실패" }, { status: 500 });
  }
}
