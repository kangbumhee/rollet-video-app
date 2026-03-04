"use client";

import { useState, useRef, useEffect } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu]);

  // ── 시스템 메시지 ──
  if (message.isSystem) {
    return (
      <div className="text-center py-1 animate-fade-in">
        <span className="text-[11px] text-white/20 bg-surface-elevated/50 px-3 py-0.5 rounded-full">
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
          <span className="text-[11px] font-bold text-neon-violet">방장봇</span>
          <p className="text-sm text-white/70 bg-neon-violet/10
                        border border-neon-violet/20 rounded-xl rounded-tl-none
                        px-3 py-1.5 mt-0.5 max-w-[280px]">
            {message.message}
          </p>
        </div>
      </div>
    );
  }

  const getNameColor = () => {
    if (message.isAdmin) return 'text-neon-amber font-bold';
    if (message.isModerator) return 'text-red-400 font-bold';
    if (isMe) return 'text-neon-cyan';
    return 'text-white/40';
  };

  const getRoleBadge = () => {
    if (message.isAdmin) return <span className="text-[9px] bg-neon-amber/20 text-neon-amber px-1 py-0.5 rounded ml-1">관리자</span>;
    if (message.isModerator) return <span className="text-[9px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded ml-1">운영자</span>;
    return null;
  };

  const handleNameClick = () => {
    if (!canManage || isMe || message.isBot || message.isSystem) return;
    setShowMenu((prev) => !prev);
  };

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
            ref={menuRef}
            className="absolute z-50 mt-1 bg-surface-elevated border border-white/[0.06] rounded-lg shadow-xl py-1 min-w-[160px]"
            style={{ left: isMe ? 'auto' : 0, right: isMe ? 0 : 'auto' }}
          >
            {profile?.isAdmin && !message.isAdmin && (
              <button
                onClick={async () => {
                  const action = message.isModerator ? 'removeModerator' : 'setModerator';
                  const label = message.isModerator ? '운영자 해제' : '운영자 지정';
                  if (!confirm(`${message.displayName}님을 ${label}하시겠습니까?`)) return;
                  try {
                    const { auth } = await import('@/lib/firebase/config');
                    const token = await auth.currentUser?.getIdToken();
                    const res = await fetch('/api/admin/moderate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ action, targetUid: message.uid, targetDisplayName: message.displayName }),
                    });
                    const data = (await res.json()) as { message?: string; error?: string };
                    alert(data.message || data.error || '완료');
                  } catch {
                    alert('실패');
                  }
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
              >
                {message.isModerator ? '🔓 운영자 해제' : '🛡️ 운영자 지정'}
              </button>
            )}
            {!(!profile?.isAdmin && (message.isAdmin || message.isModerator)) && (
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
                    alert(data.message || data.error || '완료');
                  } catch {
                    alert('실패');
                  }
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-neon-amber hover:bg-neon-amber/10 transition-colors"
              >
                🔇 채팅 금지 (10분)
              </button>
            )}
            {!(!profile?.isAdmin && (message.isAdmin || message.isModerator)) && (
              <button
                onClick={() => {
                  onKick?.(message.uid, message.displayName);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                🚫 강퇴하기 (30분)
              </button>
            )}
            {!profile?.isAdmin && (message.isAdmin || message.isModerator) && (
              <p className="px-3 py-2 text-[10px] text-white/20">
                {message.isAdmin ? '관리자에게는 제재할 수 없습니다' : '운영자 제재는 관리자만 가능합니다'}
              </p>
            )}
          </div>
        )}

        <p
          className={`text-sm mt-0.5 px-3 py-1.5 rounded-xl max-w-[260px]
            inline-block break-words
            ${
              isMe
                ? "bg-neon-cyan/15 text-white/90 rounded-tr-none border border-neon-cyan/20"
                : message.isModerator
                ? 'bg-red-500/10 text-white/80 rounded-tl-none border border-red-500/20'
                : message.isAdmin
                ? 'bg-neon-amber/10 text-white/90 rounded-tl-none border border-neon-amber/20'
                : "bg-surface-elevated text-white/70 rounded-tl-none"
            }`}
        >
          {message.message}
        </p>
      </div>
    </div>
  );
}
