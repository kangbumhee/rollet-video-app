// ============================================
// 파일: src/lib/firebase/config.ts
// 설명: Firebase 클라이언트 SDK 초기화
//       앱 전체에서 import해서 사용
// ============================================

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 빌드 시점(예: Vercel)에 env가 없으면 placeholder 사용. 실제 요청 시에는 런타임 env 사용.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "build-placeholder",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "localhost",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "build-placeholder",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "build-placeholder.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "0",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:0:web:0",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://build-placeholder.firebaseio.com",
};

// 이미 초기화되어 있으면 재사용
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 각 서비스 인스턴스
export const auth = getAuth(app);
export const realtimeDb = getDatabase(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

export default app;
