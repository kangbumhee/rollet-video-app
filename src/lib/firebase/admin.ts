// ============================================
// 파일: src/lib/firebase/admin.ts
// 설명: Firebase Admin SDK (서버 전용)
//       API Route, Cloud Functions에서 사용
// ============================================

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

let adminApp: App;

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const hasServiceAccount =
    !!projectId &&
    !!clientEmail &&
    !!privateKey &&
    !privateKey.includes("여기에입력") &&
    privateKey.includes("BEGIN PRIVATE KEY");

  adminApp = hasServiceAccount
    ? initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      })
    : initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
} else {
  adminApp = getApps()[0];
}

export const adminAuth = getAuth(adminApp);
export const adminFirestore = getFirestore(adminApp);
export const adminRealtimeDb = getDatabase(adminApp);

// 토큰 검증 헬퍼
export async function verifyAuth(
  input: Request | string
): Promise<{ uid: string; email?: string } | null> {
  try {
    const token =
      typeof input === "string"
        ? input
        : input.headers.get("Authorization")?.startsWith("Bearer ")
          ? input.headers.get("Authorization")!.split("Bearer ")[1]
          : null;
    if (!token) return null;
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}
