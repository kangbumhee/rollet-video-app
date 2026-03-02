'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/chat';
import ChatBubble from './ChatBubble';
import { useAuthStore } from '@/stores/authStore';
import { Send } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSend?: (message: string) => void;
  onSendMessage?: (message: string) => void;
  currentUid?: string;
  disabled?: boolean;
  onKick?: (uid: string, displayName: string) => void;
  onSetModerator?: (uid: string, displayName: string) => void;
}

export function ChatWindow({ messages, onSend, onSendMessage, currentUid, disabled = false, onKick }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const profile = useAuthStore((s) => s.profile);
  const sender = onSendMessage || onSend;
  const canManage = profile?.isAdmin || profile?.isModerator || false;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || disabled || !profile) return;
    sender?.(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/50">
      {/* 메시지 목록 - flex-1로 남은 공간 전부 차지 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-4">아직 채팅이 없어요. 첫 메시지를 보내보세요!</p>
        )}
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isMe={msg.uid === (currentUid || profile?.uid)}
            canManage={canManage}
            onKick={onKick}
          />
        ))}
      </div>

      {/* 입력창 - 하단 고정 */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-t border-gray-800 bg-gray-900/80">
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
            onClick={() => (window.location.href = '/login')}
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
