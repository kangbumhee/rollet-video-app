import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore, adminRealtimeDb } from "@/lib/firebase/admin";
import {
  generateOXQuizzes,
  generatePriceItems,
  generateBombQuizzes,
  generateDrawWords,
  generateTypingSentences,
} from "@/lib/gemini/gameQuiz";

const GAME_NAMES: Record<string, string> = {
  drawGuess: "🎨 그림 맞추기",
  lineRunner: "✏️ 라인 러너",
  liarVote: "🕵️ 라이어 투표",
  typingBattle: "⌨️ 타이핑 배틀",
  bombPass: "💣 폭탄 돌리기",
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

const LIAR_WORDS = [
  { category: "음식", words: ["떡볶이", "김치찌개", "치킨", "삼겹살", "비빔밥", "짜장면", "떡국", "불고기", "냉면", "김밥"] },
  { category: "동물", words: ["고양이", "강아지", "펭귄", "코끼리", "기린", "사자", "토끼", "햄스터", "돌고래", "앵무새"] },
  { category: "장소", words: ["학교", "편의점", "놀이공원", "병원", "도서관", "영화관", "공항", "수영장", "카페", "지하철"] },
  { category: "직업", words: ["의사", "소방관", "요리사", "경찰", "선생님", "가수", "과학자", "운동선수", "화가", "우주비행사"] },
  { category: "사물", words: ["우산", "냉장고", "스마트폰", "자전거", "안경", "시계", "가방", "신발", "텔레비전", "에어컨"] },
];

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
      ? (presSnap.val() as Record<string, { uid: string; displayName: string; level?: number }>)
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
    const alive: Record<string, boolean> = {};
    for (const p of players) {
      scores[p.uid] = 0;
      nameMap[p.uid] = p.displayName || p.uid.slice(0, 6);
      alive[p.uid] = true;
    }

    const roundsData: Record<string, unknown> = {};
    let gameConfig: Record<string, unknown> = {};
    let chipsToSet: Record<string, number> | null = null;

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
      case "liarVote": {
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const catIdx = Math.floor(Math.random() * LIAR_WORDS.length);
          const cat = LIAR_WORDS[catIdx];
          const wordIdx = Math.floor(Math.random() * cat.words.length);
          const realWord = cat.words[wordIdx];
          const otherWords = cat.words.filter((w) => w !== realWord);
          const fakeWord = otherWords[Math.floor(Math.random() * otherWords.length)] || "???";
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
          roundsData[`round${r}`] = {
            round: r,
            sentence: sentences[r - 1] || `타이핑 테스트 문장 ${r}번입니다`,
            timeLimit: 20,
          };
        }
        gameConfig = { type: "typingBattle" };
        break;
      }
      case "bombPass": {
        const quizzes = await generateBombQuizzes(TOTAL_ROUNDS * 3);
        for (let r = 1; r <= TOTAL_ROUNDS; r++) {
          const roundQuizzes = quizzes.slice((r - 1) * 3, r * 3);
          const bombHolder = allPlayerIds[Math.floor(Math.random() * allPlayerIds.length)];
          roundsData[`round${r}`] = {
            round: r,
            quizzes: roundQuizzes,
            initialBombHolder: bombHolder,
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
      message: `🎮 ${gameName} 시작! ${allPlayerIds.length}명 참가! ${TOTAL_ROUNDS}라운드!`,
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
      totalRounds: TOTAL_ROUNDS,
    });
  } catch (error) {
    console.error("Start game error:", error);
    return NextResponse.json({ error: "게임 시작 실패" }, { status: 500 });
  }
}
