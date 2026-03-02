// ============================================
// 파일: src/components/chat/ChatBubble.tsx
// 설명: 개별 채팅 메시지 버블
// ============================================

"use client";

import { ChatMessage } from "@/types/chat";
import LevelBadge from "@/components/user/LevelBadge";

interface ChatBubbleProps {
  message: ChatMessage;
  isMe: boolean;
}

export default function ChatBubble({ message, isMe }: ChatBubbleProps) {
  // ── 시스템 메시지 ──
  if (message.isSystem) {
    return (
      <div className="text-center py-1 animate-fade-in">
        <span className="text-[11px] text-gray-500 bg-gray-800/50 px-3 py-0.5 rounded-full">
          {message.message}
        </span>
      </div>
    );
  }

  // ── 봇 메시지 ──
  if (message.isBot) {
    return (
      <div className="flex items-start gap-2 py-1 animate-slide-up">
        <span className="text-lg flex-shrink-0">🤖</span>
        <div>
          <span className="text-[11px] font-bold text-purple-400">방장봇</span>
          <p
            className="text-sm text-purple-200 bg-purple-500/10
                        border border-purple-500/20 rounded-xl rounded-tl-none
                        px-3 py-1.5 mt-0.5 max-w-[280px]"
          >
            {message.message}
          </p>
        </div>
      </div>
    );
  }

  // ── 일반 메시지 ──
  return (
    <div className={`flex items-start gap-2 py-0.5 animate-slide-up ${isMe ? "flex-row-reverse" : ""}`}>
      <div className={`${isMe ? "text-right" : ""}`}>
        <div className={`flex items-center gap-1.5 ${isMe ? "justify-end" : ""}`}>
          <LevelBadge level={message.level} size="sm" />
          <span className={`text-[11px] font-medium ${isMe ? "text-yellow-400" : "text-gray-400"}`}>
            {message.displayName}
          </span>
        </div>
        <p
          className={`text-sm mt-0.5 px-3 py-1.5 rounded-xl max-w-[260px]
            inline-block break-words
            ${
              isMe
                ? "bg-yellow-500/20 text-yellow-100 rounded-tr-none"
                : "bg-gray-800 text-gray-200 rounded-tl-none"
            }`}
        >
          {message.message}
        </p>
      </div>
    </div>
  );
}
