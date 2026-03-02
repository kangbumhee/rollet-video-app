// ============================================
// 파일: src/types/user.ts
// ============================================

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  provider: "google" | "kakao" | "naver" | "anonymous";
  level: number;
  totalExp: number;
  tickets: number;
  consecutiveDays: number;
  lastVisit: number; // timestamp
  totalGames: number;
  totalWins: number;
  isSeller: boolean;
  isAdmin: boolean;
  createdAt: number; // timestamp
}

// Firestore에 저장할 때 사용하는 생성 데이터
export interface CreateUserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  provider: string;
}
