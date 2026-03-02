// src/hooks/useBotMessages.ts
'use client';

import { useEffect, useState } from 'react';
import { onChildAdded, query, ref, limitToLast, off } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';

interface BotMessageItem {
  id: string;
  message: string;
  timestamp: number;
}

export function useBotMessages(roomId: string) {
  const [messages, setMessages] = useState<BotMessageItem[]>([]);

  useEffect(() => {
    const chatRef = query(ref(realtimeDb, `rooms/${roomId}/chat`), limitToLast(100));
    const handler = onChildAdded(chatRef, (snap) => {
      const data = snap.val() as { uid?: string; message?: string; timestamp?: number } | null;
      if (!data || data.uid !== 'BOT_HOST') return;
      setMessages((prev) => [...prev, { id: snap.key || '', message: data.message || '', timestamp: data.timestamp || Date.now() }]);
    });

    return () => {
      off(chatRef, 'child_added', handler);
    };
  }, [roomId]);

  return { botMessages: messages };
}
