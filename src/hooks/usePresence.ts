// src/hooks/usePresence.ts
'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, set, onDisconnect, remove } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';
import { useAuthStore } from '@/stores/authStore';

export interface OnlineUser {
  uid: string;
  displayName: string;
  level: number;
  joinedAt: number;
}

export function usePresence(roomId: string, uid?: string | null) {
  void uid;
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!roomId || !profile) return;

    const presenceRef = ref(realtimeDb, `rooms/${roomId}/presence/${profile.uid}`);
    const presenceListRef = ref(realtimeDb, `rooms/${roomId}/presence`);
    const connectedRef = ref(realtimeDb, '.info/connected');

    // presence 목록 변화를 감지하여 접속자 수/목록 계산
    const unsubPresence = onValue(presenceListRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val() as Record<string, OnlineUser>;
        const users = Object.values(data);
        setOnlineCount(users.length);
        setOnlineUsers(users);
      } else {
        setOnlineCount(0);
        setOnlineUsers([]);
      }
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

  return { onlineCount, onlineUsers };
}
