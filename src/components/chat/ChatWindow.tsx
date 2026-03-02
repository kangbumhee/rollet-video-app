// ============================================
// 파일: src/components/chat/ChatWindow.tsx
// 설명: 채팅창 전체 컴포넌트
//       메시지 목록 + 입력창
// ============================================

"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/chat";
import ChatBubble from "./ChatBubble";
import { useAuthStore } from "@/stores/authStore";
import { Send } from "lucide-react";

interface ChatWindowProps {
  messages: ChatMessage[];
  onSend?: (message: string) => void;
  onSendMessage?: (message: string) => void;
  currentUid?: string;
  disabled?: boolean;
}

export function ChatWindow({ messages, onSend, onSendMessage, currentUid, disabled = false }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const profile = useAuthStore((s) => s.profile);
  const sender = onSendMessage || onSend;

  // 새 메시지 올 때 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || disabled || !profile) return;
    sender?.(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col bg-prize-card border-t border-prize-border">
      {/* 메시지 목록 */}
      <div ref={scrollRef} className="h-48 overflow-y-auto px-3 py-2 hide-scrollbar space-y-1">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-8">아직 채팅이 없어요. 첫 메시지를 보내보세요!</p>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} isMe={msg.uid === (currentUid || profile?.uid)} />
        ))}
      </div>

      {/* 입력창 */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-prize-border">
        {profile ? (
          <>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              maxLength={200}
              disabled={disabled}
              className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl
                         px-3 py-2 text-sm text-white placeholder-gray-500
                         focus:outline-none focus:border-yellow-500/50
                         disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              className="w-9 h-9 flex items-center justify-center
                         bg-yellow-500 rounded-xl text-black
                         hover:bg-yellow-400 active:scale-95
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-all"
            >
              <Send size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={() => (window.location.href = "/login")}
            className="w-full py-2 text-sm text-gray-400 bg-gray-800/50
                       border border-gray-700 rounded-xl
                       hover:text-yellow-400 hover:border-yellow-500/30
                       transition-colors"
          >
            로그인하고 채팅에 참여하세요
          </button>
        )}
      </div>
    </div>
  );
}

export default ChatWindow;
