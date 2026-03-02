// src/types/cycle.ts

// ─── 사이클 단계 ───
export type CyclePhase =
  | 'IDLE'
  | 'ANNOUNCING'
  | 'ENTRY_GATE'
  | 'GAME_LOBBY'
  | 'GAME_COUNTDOWN'
  | 'GAME_PLAYING'
  | 'GAME_RESULT'
  | 'WINNER_ANNOUNCE'
  | 'COOLDOWN';

// ─── 사이클 상태 (Realtime DB) ───
export interface CycleState {
  currentPhase: CyclePhase;
  currentRoomId: string | null;
  currentPrizeTitle: string | null;
  currentPrizeImage: string | null;
  currentGameType: string | null;
  entryType: 'AD' | 'VIDEO' | null;
  videoURL: string | null;
  phaseStartedAt: number;
  phaseEndsAt: number;
  nextSlot: string | null;
  cycleIndex: number;
  winnerId: string | null;
  winnerName: string | null;
}

// ─── 사이클 로그 (Firestore) ───
export interface CycleLog {
  id: string;
  roomId: string;
  slot: string;
  phases: {
    phase: CyclePhase;
    startedAt: number;
    endedAt: number;
  }[];
  participantCount: number;
  winnerId: string | null;
  completedAt: number;
}

// ─── 봇 메시지 타입 ───
export type BotMessageTrigger =
  | 'CYCLE_START'
  | 'PRIZE_ANNOUNCE'
  | 'ENTRY_GATE_OPEN'
  | 'GAME_START'
  | 'ROUND_START'
  | 'ROUND_END'
  | 'WINNER_ANNOUNCE'
  | 'COOLDOWN'
  | 'PERIODIC_HYPE'
  | 'PARTICIPANT_MILESTONE'
  | 'LOW_PARTICIPANTS';

export interface BotMessage {
  trigger: BotMessageTrigger;
  templates: string[];
}
