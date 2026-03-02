// ============================================
// 파일: src/hooks/usePresence.ts
// 설명: 실시간 접속자 수 + 본인 접속 등록
//       Firebase Realtime DB presence 패턴
// ============================================

"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set, onDisconnect, runTransaction } from "firebase/database";
import { realtimeDb } from "@/lib/firebase/config";
import { useAuthStore } from "@/stores/authStore";

export function usePresence(roomId: string, uid?: string | null) {
  void uid;
  const [onlineCount, setOnlineCount] = useState(0);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!roomId || !profile) return;

    // ── 접속자 수 구독 ──
    const countRef = ref(realtimeDb, `rooms/${roomId}/onlineCount`);
    const unsubCount = onValue(countRef, (snap) => {
      setOnlineCount(snap.val() || 0);
    });

    // ── 본인 접속 등록 ──
    const presenceRef = ref(realtimeDb, `rooms/${roomId}/presence/${profile.uid}`);
    const connectedRef = ref(realtimeDb, ".info/connected");

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // 접속 등록
        set(presenceRef, {
          uid: profile.uid,
          displayName: profile.displayName,
          level: profile.level,
          online: true,
          joinedAt: Date.now(),
        });

        // 접속자 수 +1
        runTransaction(countRef, (current) => (current || 0) + 1);

        // 연결 끊길 때 자동 정리
        onDisconnect(presenceRef).remove();
        onDisconnect(countRef).cancel();
      }
    });

    return () => {
      // 정리: 접속 해제
      set(presenceRef, null);
      runTransaction(countRef, (current) => Math.max((current || 1) - 1, 0));
      unsubCount();
      unsubConnected();
    };
  }, [roomId, profile]);

  return { onlineCount };
}
