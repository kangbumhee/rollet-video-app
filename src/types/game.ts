// src/types/game.ts

// ─── 게임 종류 ───
export type GameType = "rps" | "roulette" | "oxQuiz" | "numberGuess" | "speedClick";

// ─── 게임 진행 단계 ───
export type GamePhase =
  | "idle" // 대기
  | "lobby" // 대기실 (참가 접수)
  | "countdown" // 카운트다운
  | "playing" // 게임 진행 중
  | "round_result" // 라운드 결과 표시
  | "final_result" // 최종 결과
  | "completed"; // 완료

// ─── 가위바위보 전용 ───
export type RPSChoice = "rock" | "paper" | "scissors";

export interface RPSRound {
  roundNumber: number;
  matchups: RPSMatchup[];
  status: "waiting" | "in_progress" | "completed";
  startedAt: number;
  completedAt?: number;
}

export interface RPSMatchup {
  matchId: string;
  player1Id: string;
  player2Id: string | "BOT"; // BOT = 홀수일 때 자동 배정
  player1Choice?: RPSChoice;
  player2Choice?: RPSChoice;
  winnerId?: string;
  status: "waiting" | "choices_locked" | "resolved";
}

// ─── 공통 게임 세션 ───
export interface GameSession {
  id: string;
  roomId: string;
  prizeId: string;
  gameType: GameType;
  phase: GamePhase;
  participants: GameParticipant[];
  currentRound: number;
  totalRounds: number;
  rounds: Record<number, RPSRound>; // 가위바위보용, 다른 게임은 별도 구조
  winnerId?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  config: GameConfig;
}

export interface GameParticipant {
  uid: string;
  displayName: string;
  photoURL?: string;
  level: number;
  joinedAt: number;
  eliminated: boolean;
  eliminatedRound?: number;
}

export interface GameConfig {
  maxParticipants: number;
  roundTimeLimit: number; // 초 (가위바위보: 5초)
  lobbyDuration: number; // 초 (대기실: 30초)
  countdownDuration: number; // 초 (카운트다운: 3초)
  resultDisplayDuration: number; // 초 (결과 표시: 5초)
  requireTicket: boolean; // 티켓 필요 여부
  minParticipants: number;
}

// ─── 플러그인 인터페이스 ───
export interface GamePlugin {
  type: GameType;
  name: string;
  description: string;
  icon: string;
  minPlayers: number;
  maxPlayers: number;
  defaultConfig: Omit<GameConfig, "maxParticipants" | "requireTicket" | "minParticipants">;
  // 동적 컴포넌트 경로 (lazy load용)
  componentPath: string;
}

// ─── 게임 액션 (클라이언트 → 서버) ───
export interface GameAction {
  sessionId: string;
  uid: string;
  type: "rps_choice" | "roulette_spin" | "quiz_answer" | "number_guess" | "speed_click";
  payload: Record<string, unknown>;
  timestamp: number;
}

// ─── 리얼타임 DB 구조 ───
export interface RealtimeGameState {
  sessionId: string;
  phase: GamePhase;
  gameType: GameType;
  currentRound: number;
  totalRounds: number;
  participantCount: number;
  aliveCount: number;
  countdown: number;
  roundStartedAt: number;
  roundEndsAt: number;
  winnerId?: string;
  // 가위바위보 전용
  myMatchId?: string;
  myOpponentName?: string;
  matchResults?: Record<
    string,
    {
      winnerId: string;
      player1Choice: RPSChoice;
      player2Choice: RPSChoice;
      result?: "player1" | "player2" | "draw";
      player1Id?: string;
      player2Id?: string;
    }
  >;
}
