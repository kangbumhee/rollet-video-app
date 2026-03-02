// src/lib/game/engine.ts
import { ref, set, update, get } from "firebase/database";
import { doc, setDoc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { realtimeDb, firestore } from "@/lib/firebase/config";
import { getGameConfig } from "./registry";
import { generateId } from "@/lib/utils";
import type {
  GameSession,
  GameParticipant,
  GamePhase,
  GameType,
  RealtimeGameState,
  RPSRound,
  RPSMatchup,
  RPSChoice,
} from "@/types/game";

// ──────────────────────────────────────
// 게임 세션 생성
// ──────────────────────────────────────
export async function createGameSession(roomId: string, prizeId: string, gameType: GameType): Promise<string> {
  const config = getGameConfig(gameType);
  const sessionId = generateId();

  const session: GameSession = {
    id: sessionId,
    roomId,
    prizeId,
    gameType,
    phase: "lobby",
    participants: [],
    currentRound: 0,
    totalRounds: 0,
    rounds: {},
    createdAt: Date.now(),
    config,
  };

  // Firestore에 세션 저장 (영구 기록)
  await setDoc(doc(firestore, "gameSessions", sessionId), session);

  // Realtime DB에 라이브 상태 저장 (실시간 동기화)
  const rtState: RealtimeGameState = {
    sessionId,
    phase: "lobby",
    gameType,
    currentRound: 0,
    totalRounds: 0,
    participantCount: 0,
    aliveCount: 0,
    countdown: config.lobbyDuration,
    roundStartedAt: 0,
    roundEndsAt: 0,
  };

  await set(ref(realtimeDb, `games/${roomId}/current`), rtState);

  return sessionId;
}

// ──────────────────────────────────────
// 게임 참가
// ──────────────────────────────────────
export async function joinGame(
  sessionId: string,
  roomId: string,
  participant: GameParticipant
): Promise<{ success: boolean; error?: string }> {
  const sessionRef = doc(firestore, "gameSessions", sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    return { success: false, error: "게임 세션을 찾을 수 없습니다." };
  }

  const session = sessionSnap.data() as GameSession;

  if (session.phase !== "lobby") {
    return { success: false, error: "참가 접수가 마감되었습니다." };
  }

  if (session.participants.length >= session.config.maxParticipants) {
    return { success: false, error: "참가 인원이 가득 찼습니다." };
  }

  // 중복 참가 방지
  if (session.participants.some((p) => p.uid === participant.uid)) {
    return { success: false, error: "이미 참가하셨습니다." };
  }

  // Firestore 업데이트
  await updateDoc(sessionRef, {
    participants: arrayUnion(participant),
  });

  // Realtime DB 참가자 수 업데이트
  const rtRef = ref(realtimeDb, `games/${roomId}/current`);
  const rtSnap = await get(rtRef);
  const currentCount = rtSnap.val()?.participantCount ?? 0;
  await update(rtRef, {
    participantCount: currentCount + 1,
    aliveCount: currentCount + 1,
  });

  // 참가자 개별 상태
  await set(ref(realtimeDb, `games/${roomId}/participants/${participant.uid}`), {
    displayName: participant.displayName,
    photoURL: participant.photoURL || null,
    level: participant.level,
    alive: true,
    joinedAt: Date.now(),
  });

  return { success: true };
}

// ──────────────────────────────────────
// 게임 단계 전환
// ──────────────────────────────────────
export async function updateGamePhase(
  sessionId: string,
  roomId: string,
  phase: GamePhase,
  extraData?: Partial<RealtimeGameState>
): Promise<void> {
  // Firestore
  await updateDoc(doc(firestore, "gameSessions", sessionId), { phase });

  // Realtime DB
  await update(ref(realtimeDb, `games/${roomId}/current`), {
    phase,
    ...extraData,
  });
}

// ──────────────────────────────────────
// 가위바위보: 라운드 생성 (토너먼트 매칭)
// ──────────────────────────────────────
export async function createRPSRound(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  alivePlayers: string[]
): Promise<RPSRound> {
  const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
  const matchups: RPSMatchup[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const player1Id = shuffled[i];
    const player2Id = shuffled[i + 1] || "BOT"; // 홀수면 BOT 배정

    matchups.push({
      matchId: generateId(),
      player1Id,
      player2Id,
      status: "waiting",
    });
  }

  const round: RPSRound = {
    roundNumber,
    matchups,
    status: "in_progress",
    startedAt: Date.now(),
  };

  // Firestore에 라운드 저장
  await updateDoc(doc(firestore, "gameSessions", sessionId), {
    [`rounds.${roundNumber}`]: round,
    currentRound: roundNumber,
  });

  // Realtime DB: 각 참가자에게 매치 정보 전달
  const updates: Record<string, unknown> = {
    [`games/${roomId}/current/currentRound`]: roundNumber,
    [`games/${roomId}/current/phase`]: "playing",
    [`games/${roomId}/current/roundStartedAt`]: Date.now(),
    [`games/${roomId}/current/roundEndsAt`]: Date.now() + 5000, // 5초
    [`games/${roomId}/current/countdown`]: 5,
  };

  for (const match of matchups) {
    // 각 플레이어의 매치 정보를 개별 노드로
    updates[`games/${roomId}/matches/${match.matchId}`] = {
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      status: "waiting",
    };
    updates[`games/${roomId}/playerMatch/${match.player1Id}`] = {
      matchId: match.matchId,
      opponentId: match.player2Id,
    };
    if (match.player2Id !== "BOT") {
      updates[`games/${roomId}/playerMatch/${match.player2Id}`] = {
        matchId: match.matchId,
        opponentId: match.player1Id,
      };
    }
  }

  await update(ref(realtimeDb), updates);

  return round;
}

// ──────────────────────────────────────
// 가위바위보: 선택 제출
// ──────────────────────────────────────
export async function submitRPSChoice(
  sessionId: string,
  roomId: string,
  roundNumber: number,
  matchId: string,
  uid: string,
  choice: RPSChoice
): Promise<{ success: boolean; error?: string }> {
  void sessionId;
  // 시간 초과 체크
  const rtSnap = await get(ref(realtimeDb, `games/${roomId}/current`));
  const currentState = rtSnap.val() as RealtimeGameState;

  if (currentState.phase !== "playing") {
    return { success: false, error: "게임 진행 중이 아닙니다." };
  }

  if (Date.now() > currentState.roundEndsAt + 1000) {
    // 1초 여유
    return { success: false, error: "시간이 초과되었습니다." };
  }

  // 이미 선택했는지 확인
  const choiceRef = ref(realtimeDb, `games/${roomId}/choices/${roundNumber}/${matchId}/${uid}`);
  const existing = await get(choiceRef);
  if (existing.exists()) {
    return { success: false, error: "이미 선택하셨습니다." };
  }

  // 선택 저장
  await set(choiceRef, {
    choice,
    timestamp: Date.now(),
  });

  return { success: true };
}

// ──────────────────────────────────────
// 가위바위보: 승패 판정
// ──────────────────────────────────────
export function resolveRPS(choice1: RPSChoice | undefined, choice2: RPSChoice | undefined): "player1" | "player2" | "draw" {
  // 미선택 = 자동 패배
  if (!choice1 && !choice2) return "draw";
  if (!choice1) return "player2";
  if (!choice2) return "player1";

  if (choice1 === choice2) return "draw";

  const wins: Record<RPSChoice, RPSChoice> = {
    rock: "scissors",
    scissors: "paper",
    paper: "rock",
  };

  return wins[choice1] === choice2 ? "player1" : "player2";
}

// BOT 선택 생성 (레벨에 따라 약간 편향 가능)
export function generateBotChoice(): RPSChoice {
  const choices: RPSChoice[] = ["rock", "paper", "scissors"];
  return choices[Math.floor(Math.random() * 3)];
}

// ──────────────────────────────────────
// 가위바위보: 라운드 결과 처리
// ──────────────────────────────────────
export async function processRPSRound(
  sessionId: string,
  roomId: string,
  roundNumber: number
): Promise<{ winners: string[]; losers: string[]; draws: string[][] }> {
  // Firestore에서 세션 가져오기
  const sessionSnap = await getDoc(doc(firestore, "gameSessions", sessionId));
  const session = sessionSnap.data() as GameSession;
  const round = session.rounds[roundNumber];

  if (!round) throw new Error(`Round ${roundNumber} not found`);

  // Realtime DB에서 선택 가져오기
  const choicesSnap = await get(ref(realtimeDb, `games/${roomId}/choices/${roundNumber}`));
  const allChoices = choicesSnap.val() || {};

  const winners: string[] = [];
  const losers: string[] = [];
  const draws: string[][] = [];
  const matchResults: Record<string, unknown> = {};

  for (const match of round.matchups) {
    const matchChoices = allChoices[match.matchId] || {};

    const p1Choice = matchChoices[match.player1Id]?.choice as RPSChoice | undefined;
    let p2Choice: RPSChoice | undefined;

    if (match.player2Id === "BOT") {
      p2Choice = generateBotChoice();
    } else {
      p2Choice = matchChoices[match.player2Id]?.choice as RPSChoice | undefined;
    }

    // 미선택 시 랜덤 할당 (시간초과)
    const finalP1 = p1Choice || generateBotChoice();
    const finalP2 = p2Choice || generateBotChoice();

    const result = resolveRPS(p1Choice, p2Choice); // 원래 선택 기준

    if (result === "player1") {
      winners.push(match.player1Id);
      if (match.player2Id !== "BOT") losers.push(match.player2Id);
    } else if (result === "player2") {
      if (result === "player2" && match.player2Id !== "BOT") {
        winners.push(match.player2Id);
        losers.push(match.player1Id);
      } else {
        // BOT에게 지면 재대결 없이 탈락
        losers.push(match.player1Id);
      }
    } else {
      // 무승부: 둘 다 다음 라운드 진출
      winners.push(match.player1Id);
      if (match.player2Id !== "BOT") winners.push(match.player2Id);
      draws.push([match.player1Id, match.player2Id]);
    }

    matchResults[match.matchId] = {
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1Choice: finalP1,
      player2Choice: finalP2,
      winnerId: result === "draw" ? "draw" : result === "player1" ? match.player1Id : match.player2Id,
      result,
    };
  }

  // Realtime DB에 결과 반영
  const rtUpdates: Record<string, unknown> = {
    [`games/${roomId}/current/phase`]: "round_result",
    [`games/${roomId}/current/aliveCount`]: winners.length,
    [`games/${roomId}/current/matchResults`]: matchResults,
  };

  // 탈락자 표시
  for (const loserId of losers) {
    rtUpdates[`games/${roomId}/participants/${loserId}/alive`] = false;
    rtUpdates[`games/${roomId}/participants/${loserId}/eliminatedRound`] = roundNumber;
  }

  await update(ref(realtimeDb), rtUpdates);

  // Firestore 라운드 업데이트
  await updateDoc(doc(firestore, "gameSessions", sessionId), {
    [`rounds.${roundNumber}.status`]: "completed",
    [`rounds.${roundNumber}.completedAt`]: Date.now(),
  });

  return { winners, losers, draws };
}

// ──────────────────────────────────────
// 토너먼트 전체 라운드 수 계산
// ──────────────────────────────────────
export function calculateTotalRounds(participantCount: number): number {
  if (participantCount <= 1) return 0;
  return Math.ceil(Math.log2(participantCount));
}

// ──────────────────────────────────────
// 최종 우승자 결정
// ──────────────────────────────────────
export async function finalizeGame(sessionId: string, roomId: string, winnerId: string): Promise<void> {
  // Firestore
  await updateDoc(doc(firestore, "gameSessions", sessionId), {
    phase: "completed",
    winnerId,
    completedAt: Date.now(),
  });

  // Realtime DB
  await update(ref(realtimeDb, `games/${roomId}/current`), {
    phase: "final_result",
    winnerId,
  });
}
