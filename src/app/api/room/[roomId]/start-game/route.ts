import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore, adminRealtimeDb } from "@/lib/firebase/admin";
import {
  generateOXQuizzes,
  generatePriceItems,
  generateDrawWords,
  generateTypingSentences,
} from "@/lib/gemini/gameQuiz";

export const dynamic = 'force-dynamic';

const GAME_NAMES: Record<string, string> = {
  drawGuess: "🎨 그림 맞추기",
  lineRunner: "✏️ 라인 러너",
  bigRoulette: "🎰 빅 룰렛",
  typingBattle: "⌨️ 타이핑 배틀",
  weaponForge: "⚔️ 무기 강화 대전",
  priceGuess: "💰 가격 맞추기",
  oxSurvival: "⭕ OX 서바이벌",
  destinyAuction: "🎰 운명의 경매",
  nunchiGame: "👀 눈치 게임",
  quickTouch: "🎯 순발력 터치",
};
const VALID_GAMES = Object.keys(GAME_NAMES);

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

    const { gameType } = (await req.json()) as { gameType?: string };
    if (!gameType || !VALID_GAMES.includes(gameType)) {
      return NextResponse.json({ error: "유효하지 않은 게임" }, { status: 400 });
    }

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

    const gameName = GAME_NAMES[gameType];
    const TOTAL_ROUNDS = 10;
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
            round: r,
            drawerId: shuffledPlayers[drawerIdx],
            drawerName: nameMap[shuffledPlayers[drawerIdx]],
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
          const gapBase = 200 - r * 10;
          for (let i = 0; i < 15 + r * 3; i++) {
            obstacles.push({
              x: 300 + i * (gapBase + Math.floor(Math.random() * 80)),
              y: Math.floor(Math.random() * 250) + 50,
              w: 30 + Math.floor(Math.random() * 40),
              h: 30 + Math.floor(Math.random() * 40),
            });
          }
          roundsData[`round${r}`] = {
            round: r,
            obstacles,
            speedMultiplier: 1 + r * 0.15,
            timeLimit: 30,
          };
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
        const rouletteCoins: Record<string, number> = {};
        for (const p of players) rouletteCoins[p.uid] = 500;
        rouletteCoinsToSet = rouletteCoins;
        break;
      }
      case "typingBattle": {
        const sentences = await generateTypingSentences(TOTAL_ROUNDS);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          roundsData[`round${r}`] = {
            round: r,
            sentence: sentences[r - 1] || `타이핑 테스트 문장 ${r}번입니다`,
            timeLimit: 20,
          };
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
          roundsData[`round${r}`] = {
            round: r,
            itemName: item.name,
            actualPrice: item.price,
            hint: item.hint,
            category: item.category,
            timeLimit: 15,
          };
        }
        gameConfig = { type: "priceGuess" };
        break;
      }
      case "oxSurvival": {
        const quizzes = await generateOXQuizzes(TOTAL_ROUNDS);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const quiz = quizzes[r - 1] || { q: `비상 퀴즈 ${r}`, a: true, explanation: "" };
          roundsData[`round${r}`] = {
            round: r,
            question: quiz.q,
            answer: quiz.a,
            explanation: quiz.explanation,
            timeLimit: 10,
          };
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
          roundsData[`round${r}`] = {
            round: r,
            maxNumber: Math.max(3, allPlayerIds.length - r + 1),
            timeLimit: 15,
          };
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
          roundsData[`round${r}`] = {
            round: r,
            targets,
            duration: 15,
          };
        }
        gameConfig = { type: "quickTouch" };
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
