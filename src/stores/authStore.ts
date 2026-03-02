// ============================================
// 파일: src/stores/authStore.ts
// 설명: 전역 인증 상태 관리 (Zustand)
// ============================================

import { create } from "zustand";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase/config";
import { UserProfile } from "@/types/user";

interface AuthState {
  user: FirebaseUser | null;
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;

  // 액션
  init: () => () => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  profile: null,
  loading: true,
  initialized: false,

  // ── Firebase Auth 상태 리스너 초기화 ──
  init: () => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 유저 프로필 로드 또는 생성
        const profile = await getOrCreateProfile(user);
        set({ user, firebaseUser: user, profile, loading: false, initialized: true });
      } else {
        set({ user: null, firebaseUser: null, profile: null, loading: false, initialized: true });
      }
    });
    return unsubscribe;
  },

  // ── Google 로그인 ──
  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      // onAuthStateChanged에서 자동으로 프로필 처리
    } catch (error: unknown) {
      console.error("Google 로그인 실패:", error);
      set({ loading: false });
      throw error;
    }
  },

  // ── 로그아웃 ──
  signOutUser: async () => {
    await firebaseSignOut(auth);
    set({ user: null, firebaseUser: null, profile: null });
  },

  // ── 프로필 새로고침 ──
  refreshProfile: async () => {
    const { firebaseUser } = get();
    if (!firebaseUser) return;
    const profile = await getOrCreateProfile(firebaseUser);
    set({ profile });
  },
}));

// ── 헬퍼: 프로필 가져오기 또는 새로 만들기 ──
async function getOrCreateProfile(user: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(firestore, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    // 기존 유저 → 마지막 방문 업데이트
    const data = snap.data() as UserProfile;
    await updateDoc(userRef, { lastVisit: Date.now() });
    return { ...data, lastVisit: Date.now() };
  }

  // 신규 유저 생성
  const newProfile: UserProfile = {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || "익명",
    photoURL: user.photoURL || "",
    provider: getProvider(user),
    level: 1,
    totalExp: 0,
    tickets: 0,
    consecutiveDays: 1,
    lastVisit: Date.now(),
    totalGames: 0,
    totalWins: 0,
    isSeller: false,
    isAdmin: false,
    createdAt: Date.now(),
  };

  await setDoc(userRef, newProfile);
  return newProfile;
}

function getProvider(user: FirebaseUser): UserProfile["provider"] {
  const providerId = user.providerData[0]?.providerId || "";
  if (providerId.includes("google")) return "google";
  if (providerId.includes("kakao")) return "kakao";
  if (providerId.includes("naver")) return "naver";
  return "anonymous";
}
