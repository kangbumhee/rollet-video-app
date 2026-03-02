import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore, adminRealtimeDb } from "@/lib/firebase/admin";

const GAME_NAMES: Record<string, string> = {
  luckyDice: "🎲 운명의 주사위",
  stockRace: "📈 주식 레이스",
  highLow: "🃏 하이 & 로우",
  coinBet: "🪙 코인 올인",
  horseRace: "🏇 경마 레이스",
  floorRoulette: "🎯 바닥 룰렛",
  goldRush: "⛏️ 골드러시",
  bombDefuse: "💣 폭탄 해제",
  tideWave: "🌊 밀물 썰물",
  treasureHunt: "🗺️ 보물찾기",
};

const VALID_GAMES = Object.keys(GAME_NAMES);

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

    if (!userData?.isAdmin && !userData?.isModerator) {
      return NextResponse.json({ error: "매니저 권한이 필요합니다" }, { status: 403 });
    }

    const { gameType } = (await req.json()) as { gameType?: string };
    if (!gameType || !VALID_GAMES.includes(gameType)) {
      return NextResponse.json({ error: "유효하지 않은 게임 타입" }, { status: 400 });
    }

    // 현재 접속자 확인
    const presSnap = await adminRealtimeDb.ref(`rooms/${roomId}/presence`).get();
    const presData = presSnap.exists()
      ? (presSnap.val() as Record<string, { uid: string; displayName: string; level?: number }>)
      : {};
    const players = Object.values(presData);

    if (players.length < 2) {
      return NextResponse.json({ error: "최소 2명 이상 접속해야 게임을 시작할 수 있습니다" }, { status: 400 });
    }

    // 이미 진행 중인 게임 확인
    const currentSnap = await adminRealtimeDb.ref(`games/${roomId}/current`).get();
    if (currentSnap.exists()) {
      const current = currentSnap.val() as { phase?: string; startedAt?: number } | null;
      if (current?.phase && current.phase !== "idle" && current.phase !== "final_result") {
        // 10분 이상 지난 게임은 자동 리셋 허용
        const elapsed = Date.now() - (current.startedAt || 0);
        if (elapsed < 10 * 60 * 1000) {
          return NextResponse.json({ error: "이미 게임이 진행 중입니다" }, { status: 409 });
        }
        // 10분 초과: 이전 게임 데이터 삭제 후 진행
        await adminRealtimeDb.ref(`games/${roomId}`).remove();
      }
    }

    const gameName = GAME_NAMES[gameType];
    const TOTAL_ROUNDS = 10;

    // 참가자 초기화
    const scores: Record<string, number> = {};
    const nameMap: Record<string, string> = {};
    const participantData: Record<string, { displayName: string; level: number; alive: boolean }> = {};

    for (const p of players) {
      scores[p.uid] = 0;
      nameMap[p.uid] = p.displayName || p.uid.slice(0, 6);
      participantData[p.uid] = {
        displayName: p.displayName || p.uid.slice(0, 6),
        level: p.level || 1,
        alive: true,
      };
    }

    const allPlayerIds = players.map((p) => p.uid);

    // 게임 상태 RTDB에 세팅
    await adminRealtimeDb.ref(`games/${roomId}`).set({
      current: {
        gameType,
        gameName,
        phase: "game_intro",
        totalPlayers: allPlayerIds.length,
        totalRounds: TOTAL_ROUNDS,
        round: 0,
        scores,
        nameMap,
        startedAt: Date.now(),
        startedBy: decoded.uid,
      },
      participants: participantData,
    });

    // 방 채팅에 알림
    await adminRealtimeDb.ref(`chat/${roomId}/messages`).push({
      uid: "BOT_HOST",
      displayName: "🎪 방장봇",
      message: `🎮 ${gameName} 시작! ${allPlayerIds.length}명 전원 참가! 10라운드!`,
      timestamp: Date.now(),
      isBot: true,
      isSystem: false,
      type: "bot",
    });

    // 모든 라운드 데이터를 한번에 생성
    const roundsData: Record<string, unknown> = {};

    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
      const mult = r === TOTAL_ROUNDS ? 2 : 1;

      switch (gameType) {
        case "luckyDice": {
          const dice = [1, 2, 3].map(() => Math.floor(Math.random() * 6) + 1);
          const sum = dice.reduce((a, b) => a + b, 0);
          const hasSeven = sum === 7 || sum === 14;
          roundsData[`round${r}`] = {
            round: r, mult, type: "luckyDice", dice, sum, hasSeven,
            choices: ["safe", "risk"],
            choiceLabels: ["🛡️ 안전 (합계÷2)", "🔥 위험 (합계, 7/14면 0점)"],
            timeLimit: 15,
          };
          break;
        }
        case "stockRace": {
          const changes = [0, 1, 2].map(() => Math.floor(Math.random() * 81) - 30);
          roundsData[`round${r}`] = {
            round: r, mult, type: "stockRace", changes,
            choices: ["0", "1", "2"],
            choiceLabels: ["🚀 로켓코인", "💎 다이아주식", "🔥 파이어토큰"],
            timeLimit: 12,
          };
          break;
        }
        case "highLow": {
          const currentCard = Math.floor(Math.random() * 13) + 1;
          const nextCard = Math.floor(Math.random() * 13) + 1;
          const cardNames = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
          roundsData[`round${r}`] = {
            round: r, mult, type: "highLow",
            currentCard, nextCard,
            currentCardName: cardNames[currentCard - 1],
            nextCardName: cardNames[nextCard - 1],
            actual: nextCard > currentCard ? "high" : nextCard < currentCard ? "low" : "same",
            choices: ["high", "low"],
            choiceLabels: ["⬆️ HIGH", "⬇️ LOW"],
            timeLimit: 10,
          };
          break;
        }
        case "coinBet": {
          const coinResult = Math.random() < 0.5 ? "heads" : "tails";
          roundsData[`round${r}`] = {
            round: r, mult, type: "coinBet", coinResult,
            choices: ["10", "30", "50", "allin"],
            choiceLabels: ["10", "30", "50", "올인"],
            timeLimit: 12,
          };
          break;
        }
        case "horseRace": {
          const result = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
          roundsData[`round${r}`] = {
            round: r, mult, type: "horseRace", result,
            choices: ["0", "1", "2", "3", "4"],
            choiceLabels: ["🐎 번개", "🦄 유니콘", "🐴 돌풍", "🏇 질주", "🎠 회전목마"],
            timeLimit: 12,
          };
          break;
        }
        case "floorRoulette": {
          const winZone = Math.floor(Math.random() * 4);
          roundsData[`round${r}`] = {
            round: r, mult, type: "floorRoulette", winZone,
            choices: ["0", "1", "2", "3"],
            choiceLabels: ["🟥 빨강", "🟦 파랑", "🟩 초록", "🟨 노랑"],
            timeLimit: 10,
          };
          break;
        }
        case "goldRush": {
          const golds = [0, 1, 2].map(() => Math.floor(Math.random() * 251) + 50);
          roundsData[`round${r}`] = {
            round: r, mult, type: "goldRush", golds,
            choices: ["0", "1", "2"],
            choiceLabels: ["⛏️ A광산", "🏔️ B광산", "🌋 C광산"],
            timeLimit: 10,
          };
          break;
        }
        case "bombDefuse": {
          const bombWire = Math.floor(Math.random() * 3);
          roundsData[`round${r}`] = {
            round: r, mult, type: "bombDefuse", bombWire,
            choices: ["0", "1", "2"],
            choiceLabels: ["🔴 빨간선", "🔵 파란선", "🟢 초록선"],
            timeLimit: 10,
          };
          break;
        }
        case "tideWave": {
          const seaLevel = Math.floor(Math.random() * 80) + 10;
          roundsData[`round${r}`] = {
            round: r, mult, type: "tideWave", seaLevel,
            choices: "number",
            choiceLabels: ["0~100 숫자 입력"],
            timeLimit: 12,
          };
          break;
        }
        case "treasureHunt": {
          const grid: number[] = new Array(25).fill(0);
          const specials: number[] = [];
          const addSpecial = (val: number) => {
            let pos = Math.floor(Math.random() * 25);
            while (specials.includes(pos)) pos = Math.floor(Math.random() * 25);
            specials.push(pos);
            grid[pos] = val;
          };
          addSpecial(100);
          addSpecial(50);
          addSpecial(50);
          addSpecial(20);
          addSpecial(20);
          addSpecial(-20);
          addSpecial(-20);
          addSpecial(-20);
          roundsData[`round${r}`] = {
            round: r, mult, type: "treasureHunt", grid,
            choices: "grid25",
            choiceLabels: ["5x5 격자에서 한 칸 선택"],
            timeLimit: 10,
          };
          break;
        }
      }
    }

    // 모든 라운드 데이터를 미리 저장
    await adminRealtimeDb.ref(`games/${roomId}/rounds`).set(roundsData);

    // 게임 상태 업데이트
    await adminRealtimeDb.ref(`games/${roomId}/current`).update({
      phase: "round_waiting",
      round: 1,
      roundsReady: true,
    });

    return NextResponse.json({
      success: true,
      message: `${gameName} 시작됨! ${allPlayerIds.length}명 참가`,
      gameType,
      gameName,
      totalPlayers: allPlayerIds.length,
      totalRounds: TOTAL_ROUNDS,
    });
  } catch (error) {
    console.error("Start game error:", error);
    return NextResponse.json({ error: "게임 시작 실패" }, { status: 500 });
  }
}
