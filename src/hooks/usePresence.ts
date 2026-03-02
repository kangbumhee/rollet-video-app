// src/hooks/usePresence.ts
'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, set, onDisconnect, remove } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';
import { useAuthStore } from '@/stores/authStore';

export function usePresence(roomId: string, uid?: string | null) {
  void uid;
  const [onlineCount, setOnlineCount] = useState(0);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!roomId || !profile) return;

    const presenceRef = ref(realtimeDb, `rooms/${roomId}/presence/${profile.uid}`);
    const presenceListRef = ref(realtimeDb, `rooms/${roomId}/presence`);
    const connectedRef = ref(realtimeDb, '.info/connected');

    // presence 목록 변화를 감지하여 접속자 수 계산
    const unsubPresence = onValue(presenceListRef, (snap) => {
      const count = snap.exists() ? Object.keys(snap.val()).length : 0;
      setOnlineCount(count);
    });

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // 접속 등록
        set(presenceRef, {
          uid: profile.uid,
          displayName: profile.displayName,
          level: profile.level,
          joinedAt: Date.now(),
        });

        // 연결 끊기면 자동 삭제
        onDisconnect(presenceRef).remove();
      }
    });

    return () => {
      remove(presenceRef);
      unsubPresence();
      unsubConnected();
    };
  }, [roomId, profile]);

  return { onlineCount };
}
