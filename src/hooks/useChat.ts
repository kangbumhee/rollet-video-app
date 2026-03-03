'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, push, onChildAdded, query, orderByChild, limitToLast, get, startAfter } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';
import type { ChatMessage } from '@/types/chat';
import { soundManager } from '@/lib/sounds/SoundManager';

interface ChatSender {
  uid: string;
  displayName: string;
  photoURL?: string;
  level?: number;
  isModerator?: boolean;
  isAdmin?: boolean;
}

function parseMessage(snapshot: { key: string | null; val: () => Record<string, unknown> }): ChatMessage {
  const data = snapshot.val();
  return {
    id: snapshot.key || '',
    uid: (data.uid as string) || '',
    displayName: (data.displayName as string) || '익명',
    level: (data.level as number) || 1,
    message: (data.text as string) || (data.message as string) || '',
    timestamp: (data.timestamp as number) || Date.now(),
    isBot: data.type === 'bot' || !!data.isBot,
    isSystem: data.type === 'system' || !!data.isSystem,
    isModerator: !!data.isModerator,
    isAdmin: !!data.isAdmin,
  };
}

export function useChat(roomId: string, sender?: ChatSender) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const initialLoadDoneRef = useRef(false);
  const lastTimestampRef = useRef<number>(0);
  const liveUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!roomId) return;

    initialLoadDoneRef.current = false;
    lastTimestampRef.current = 0;
    setMessages([]);
    liveUnsubRef.current = null;

    const chatRef = ref(realtimeDb, `chat/${roomId}/messages`);
    const recentQuery = query(chatRef, orderByChild('timestamp'), limitToLast(50));

    get(recentQuery)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const loaded: ChatMessage[] = [];
          snapshot.forEach((child) => {
            const msg = parseMessage(child);
            loaded.push(msg);
            if (msg.timestamp > lastTimestampRef.current) {
              lastTimestampRef.current = msg.timestamp;
            }
          });
          loaded.sort((a, b) => a.timestamp - b.timestamp);
          setMessages(loaded);
        }
        initialLoadDoneRef.current = true;

        const liveQuery = query(
          chatRef,
          orderByChild('timestamp'),
          startAfter(lastTimestampRef.current || Date.now())
        );

        const unsub = onChildAdded(liveQuery, (childSnap) => {
          const message = parseMessage(childSnap);

          if (message.uid !== (sender?.uid || '')) {
            soundManager.play('chat-pop');
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            const updated = [...prev, message];
            return updated.length > 200 ? updated.slice(-200) : updated;
          });
        });
        liveUnsubRef.current = unsub;
      })
      .catch((err) => {
        console.error('[useChat] Initial load error:', err);
        initialLoadDoneRef.current = true;
      });

    return () => {
      liveUnsubRef.current?.();
      liveUnsubRef.current = null;
      setMessages([]);
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

      try {
        const { auth: clientAuth } = await import('@/lib/firebase/config');
        const token = await clientAuth.currentUser?.getIdToken();
        if (token) {
          const muteRes = await fetch('/api/chat/check-mute', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const muteData = (await muteRes.json()) as { muted?: boolean; remainingMinutes?: number };
          if (muteData.muted) {
            alert(`채팅이 금지되었습니다. ${muteData.remainingMinutes || 0}분 후 해제됩니다.`);
            return;
          }
        }
      } catch {
        // 체크 실패 시 통과
      }

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
        isModerator: sender?.isModerator || false,
        isAdmin: sender?.isAdmin || false,
      });
    },
    [roomId, sender]
  );

  return { messages, sendMessage };
}
