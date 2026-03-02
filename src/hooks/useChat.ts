'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, push, onChildAdded, query, orderByChild, startAt } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';
import type { ChatMessage } from '@/types/chat';
import { soundManager } from '@/lib/sounds/SoundManager';

interface ChatSender {
  uid: string;
  displayName: string;
  photoURL?: string;
  level?: number;
}

export function useChat(roomId: string, sender?: ChatSender) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const joinedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!roomId) return;

    // 접속 시점 타임스탬프 기록
    const joinedAt = Date.now();
    joinedAtRef.current = joinedAt;
    setMessages([]);

    const chatRef = ref(realtimeDb, `chat/${roomId}/messages`);
    // 접속 시점 이후 메시지만 구독
    const chatQuery = query(
      chatRef,
      orderByChild('timestamp'),
      startAt(joinedAt)
    );

    const unsubscribe = onChildAdded(chatQuery, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      
      const message: ChatMessage = {
        id: snapshot.key || '',
        uid: data.uid || '',
        displayName: data.displayName || '익명',
        level: data.level || 1,
        message: data.text || data.message || '',
        timestamp: data.timestamp || Date.now(),
        isBot: data.type === 'bot' || data.isBot || false,
        isSystem: data.type === 'system' || data.isSystem || false,
      };

      if (message.uid !== (sender?.uid || '')) {
        soundManager.play('chat-pop');
      }

      setMessages((prev) => {
        // 중복 방지
        if (prev.some((m) => m.id === message.id)) return prev;
        // 최대 100개 유지
        const updated = [...prev, message];
        return updated.length > 100 ? updated.slice(-100) : updated;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, sender?.uid]);

  const sendMessage = useCallback(
    async (...args: [string] | [string, string, string, string?, number?]) => {
      if (!roomId) return;

      let uid = '';
      let displayName = '';
      let text = '';
      let photoURL: string | undefined;
      let level = 1;

      if (args.length === 1) {
        if (!sender?.uid) return;
        uid = sender.uid;
        displayName = sender.displayName;
        text = args[0];
        photoURL = sender.photoURL;
        level = sender.level || 1;
      } else {
        const [argUid, argDisplayName, argText, argPhotoURL, argLevel] = args;
        uid = argUid;
        displayName = argDisplayName;
        text = argText;
        photoURL = argPhotoURL;
        level = argLevel || 1;
      }

      if (!text.trim()) return;

      const chatRef = ref(realtimeDb, `chat/${roomId}/messages`);
      await push(chatRef, {
        uid,
        displayName,
        photoURL: photoURL || null,
        level: level || 1,
        message: text.trim(),
        text: text.trim(),
        timestamp: Date.now(),
        type: 'user',
        isBot: false,
        isSystem: false,
      });
    },
    [roomId, sender]
  );

  return { messages, sendMessage };
}
