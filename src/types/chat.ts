// ============================================
// 파일: src/types/chat.ts
// ============================================

export interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  level: number;
  message: string;
  isBot: boolean;
  isSystem: boolean; // 시스템 메시지 (입장, 당첨 등)
  timestamp: number;
  isModerator?: boolean;
  isAdmin?: boolean;
}
