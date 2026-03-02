// ============================================
// 파일: src/hooks/useChat.ts
// 설명: 실시간 채팅 커스텀 훅
//       Firebase Realtime DB 사용
// ============================================

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ref, push, onChildAdded, query, limitToLast, orderByChild, off, DataSnapshot } from "firebase/database";
import { realtimeDb } from "@/lib/firebase/config";
import { ChatMessage } from "@/types/chat";

const MAX_MESSAGES = 100; // 화면에 유지할 최대 메시지 수

interface ChatSender {
  uid: string;
  displayName: string;
  photoURL?: string;
  level: number;
}

export function useChat(roomId: string, sender?: ChatSender) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const listenerRef = useRef<boolean>(false);

  useEffect(() => {
    if (!roomId || listenerRef.current) return;
    listenerRef.current = true;

    const chatRef = query(ref(realtimeDb, `rooms/${roomId}/chat`), orderByChild("timestamp"), limitToLast(MAX_MESSAGES));

    const handleNewMessage = (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const msg: ChatMessage = {
        id: snapshot.key!,
        uid: data.uid || "",
        displayName: data.displayName || "익명",
        level: data.level || 1,
        message: data.message || "",
        isBot: data.isBot || false,
        isSystem: data.isSystem || false,
        timestamp: data.timestamp || Date.now(),
      };

      setMessages((prev) => {
        const updated = [...prev, msg];
        // 최대 메시지 수 유지
        if (updated.length > MAX_MESSAGES) {
          return updated.slice(-MAX_MESSAGES);
        }
        return updated;
      });
    };

    onChildAdded(chatRef, handleNewMessage);
    setIsConnected(true);

    return () => {
      off(chatRef, "child_added", handleNewMessage);
      listenerRef.current = false;
      setIsConnected(false);
    };
  }, [roomId]);

  // ── 메시지 전송 ──
  const sendMessage = useCallback(
    async (...args: [string] | [string, string, number, string]) => {
      if (!roomId) return;
      const chatRef = ref(realtimeDb, `rooms/${roomId}/chat`);

      // new style: sendMessage("message")
      if (args.length === 1) {
        const message = args[0];
        if (!message.trim() || !sender?.uid) return;
        await push(chatRef, {
          uid: sender.uid,
          displayName: sender.displayName,
          photoURL: sender.photoURL || null,
          level: sender.level,
          message: message.trim(),
          isBot: false,
          isSystem: false,
          timestamp: Date.now(),
        });
        return;
      }

      // legacy style: sendMessage(uid, displayName, level, message)
      const [uid, displayName, level, message] = args;
      if (!message.trim()) return;
      await push(chatRef, {
        uid,
        displayName,
        level,
        message: message.trim(),
        isBot: false,
        isSystem: false,
        timestamp: Date.now(),
      });
    },
    [roomId, sender]
  );

  // ── 시스템 메시지 전송 ──
  const sendSystemMessage = useCallback(
    async (message: string) => {
      if (!roomId) return;
      const chatRef = ref(realtimeDb, `rooms/${roomId}/chat`);
      await push(chatRef, {
        uid: "SYSTEM",
        displayName: "시스템",
        level: 0,
        message,
        isBot: false,
        isSystem: true,
        timestamp: Date.now(),
      });
    },
    [roomId]
  );

  return { messages, sendMessage, sendSystemMessage, isConnected };
}
