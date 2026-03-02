// ============================================
// 파일: src/types/room.ts
// ============================================

export type DeliveryType = "SELF_DELIVERY" | "CONSIGNMENT" | "SPONSORED";
export type RoomStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "LIVE"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";
export type EntryMethod = "AD" | "VIDEO";
export type GameType = "rps" | "roulette" | "numberGuess" | "oxQuiz" | "speedClick";
export type RoomPhase = "waiting" | "entry" | "playing" | "result" | "idle";

export interface RoomPrize {
  imageURL: string;
  title: string;
  description: string;
  estimatedValue: number;
  videoURL?: string;
  videoDuration?: number;
}

export interface Room {
  id: string;
  ownerId: string;
  ownerType: "PLATFORM" | "SELLER";
  prize: RoomPrize;
  deliveryType: DeliveryType;
  gameType: GameType;
  status: RoomStatus;
  entryMethod: EntryMethod;
  scheduledAt: number;
  winnerId?: string;
  winnerName?: string;
  participants: number;
  createdAt: number;
  updatedAt: number;
}

// Realtime DB의 실시간 방 상태
export interface RoomRealtimeState {
  phase: RoomPhase;
  onlineCount: number;
  currentPrizeId: string;
  gameSessionId?: string;
  countdown: number;
  nextGameAt: number;
}
