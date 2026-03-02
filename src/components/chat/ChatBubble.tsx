// ============================================
// 파일: src/components/chat/ChatBubble.tsx
// 설명: 개별 채팅 메시지 버블
// ============================================

"use client";

import { useState } from 'react';
import { ChatMessage } from "@/types/chat";
import LevelBadge from "@/components/user/LevelBadge";
import { useAuthStore } from '@/stores/authStore';

interface ChatBubbleProps {
  message: ChatMessage;
  isMe: boolean;
  canManage?: boolean;
  onKick?: (uid: string, displayName: string) => void;
}

export default function ChatBubble({ message, isMe, canManage, onKick }: ChatBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const profile = useAuthStore((s) => s.profile);

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

  const getNameColor = () => {
    if (message.isAdmin) return 'text-yellow-400 font-bold';
    if (message.isModerator) return 'text-red-500 font-bold';
    if (isMe) return 'text-yellow-400';
    return 'text-gray-400';
  };

  const getRoleBadge = () => {
    if (message.isAdmin) return <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1 py-0.5 rounded ml-1">관리자</span>;
    if (message.isModerator) return <span className="text-[9px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded ml-1">운영자</span>;
    return null;
  };

  const handleNameClick = () => {
    if (!canManage || isMe || message.isBot || message.isSystem) return;
    setShowMenu(!showMenu);
  };

  // ── 일반 메시지 ──
  return (
    <div className={`flex items-start gap-2 py-0.5 animate-slide-up ${isMe ? "flex-row-reverse" : ""}`}>
      <div className={`${isMe ? "text-right" : ""} relative`}>
        <div className={`flex items-center gap-1.5 ${isMe ? "justify-end" : ""}`}>
          <LevelBadge level={message.level} size="sm" />
          <span
            className={`text-[11px] font-medium cursor-pointer hover:underline ${getNameColor()}`}
            onClick={handleNameClick}
          >
            {message.displayName}
          </span>
          {getRoleBadge()}
        </div>

        {showMenu && canManage && (
          <div
            className="absolute z-50 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]"
            style={{ left: isMe ? 'auto' : 0, right: isMe ? 0 : 'auto' }}
          >
            {/* 관리자만: 운영자 지정/해제 */}
            {profile?.isAdmin && !message.isAdmin && (
              <button
                onClick={async () => {
                  const action = message.isModerator ? 'removeModerator' : 'setModerator';
                  const label = message.isModerator ? '운영자 해제' : '운영자 지정';
                  if (!confirm(`${message.displayName}님을 ${label}하시겠습니까?`)) return;
                  try {
                    const { auth } = await import('@/lib/firebase/config');
                    const token = await auth.currentUser?.getIdToken();
                    await fetch('/api/admin/moderate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ action, targetUid: message.uid, targetDisplayName: message.displayName }),
                    });
                    alert(`${message.displayName}님 ${label} 완료`);
                  } catch {
                    alert('실패');
                  }
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/10 transition-colors"
              >
                {message.isModerator ? '🔓 운영자 해제' : '🛡️ 운영자 지정'}
              </button>
            )}
            {/* 채팅 금지 */}
            <button
              onClick={async () => {
                if (!confirm(`${message.displayName}님을 10분간 채팅 금지하시겠습니까?`)) return;
                try {
                  const { auth } = await import('@/lib/firebase/config');
                  const token = await auth.currentUser?.getIdToken();
                  const res = await fetch('/api/admin/moderate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ action: 'mute', targetUid: message.uid, targetDisplayName: message.displayName }),
                  });
                  const data = (await res.json()) as { message?: string; error?: string };
                  alert(data.message || data.error || '실패');
                } catch {
                  alert('실패');
                }
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/10 transition-colors"
            >
              🔇 채팅 금지 (10분)
            </button>
            {/* 강퇴 */}
            <button
              onClick={() => {
                onKick?.(message.uid, message.displayName);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              🚫 강퇴하기 (30분)
            </button>
          </div>
        )}

        <p
          className={`text-sm mt-0.5 px-3 py-1.5 rounded-xl max-w-[260px]
            inline-block break-words
            ${
              isMe
                ? "bg-yellow-500/20 text-yellow-100 rounded-tr-none"
                : message.isModerator
                ? 'bg-red-500/10 text-red-100 rounded-tl-none border border-red-500/20'
                : message.isAdmin
                ? 'bg-yellow-500/10 text-yellow-100 rounded-tl-none border border-yellow-500/20'
                : "bg-gray-800 text-gray-200 rounded-tl-none"
            }`}
        >
          {message.message}
        </p>
      </div>
    </div>
  );
}
