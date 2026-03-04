"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { GameType } from "@/types/game";

interface GameLobbyProps {
  roomId: string; sessionId: string; uid: string | null; displayName: string;
  photoURL?: string; level: number;
  participantMap: Record<string, { displayName: string; photoURL: string | null; level: number; alive: boolean }>;
  participantCount: number; countdown: number; gameType: GameType; gameName: string; gameIcon: string;
}

export function GameLobby({ roomId, sessionId, uid, displayName, photoURL, level, participantMap, participantCount, countdown, gameType, gameName, gameIcon }: GameLobbyProps) {
  void gameType;
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lobbyCountdown, setLobbyCountdown] = useState(countdown);

  useEffect(() => { if (uid && participantMap[uid]) setHasJoined(true); }, [uid, participantMap]);

  useEffect(() => {
    setLobbyCountdown(countdown);
    const interval = setInterval(() => { setLobbyCountdown((prev) => Math.max(0, prev - 1)); }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleJoin = async () => {
    if (!uid) { setError("로그인이 필요합니다."); return; }
    setIsJoining(true); setError(null);
    try {
      const res = await apiClient("/api/game/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, roomId, displayName, photoURL, level }) });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) setHasJoined(true); else setError(data.error || "참가 실패");
    } catch { setError("참가 중 오류가 발생했습니다."); }
    finally { setIsJoining(false); }
  };

  const participants = Object.entries(participantMap);

  return (
    <div className="flex flex-col items-center p-6 space-y-6">
      <div className="text-center">
        <span className="text-6xl block mb-3 animate-bounce">{gameIcon}</span>
        <h2 className="text-2xl font-bold text-white">{gameName}</h2>
        <p className="text-sm text-white/30 mt-1">참가자를 모집하고 있습니다</p>
      </div>

      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="none" className="text-surface-elevated" />
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="none"
            strokeDasharray={`${(lobbyCountdown / 30) * 283} 283`} strokeLinecap="round" className="text-neon-magenta transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white font-score">{lobbyCountdown}</span>
        </div>
      </div>

      {!hasJoined ? (
        <button onClick={handleJoin} disabled={isJoining || !uid || lobbyCountdown <= 0}
          className="w-full max-w-xs bg-neon-magenta/80 hover:bg-neon-magenta text-white font-bold py-3 text-lg rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
          {isJoining ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />참가 중...
            </span>
          ) : uid ? "🎮 참가하기" : "로그인 후 참가 가능"}
        </button>
      ) : (
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="text-xl">✅</span>
          <span className="font-medium">참가 완료! 게임 시작을 기다리세요</span>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="text-center">
        <Badge variant="outline" className="text-lg px-4 py-1 border-white/[0.1] text-white/60">👥 {participantCount}명 참가 중</Badge>
      </div>

      <div className="w-full max-w-md">
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto hide-scrollbar">
          {participants.map(([pUid, p]) => (
            <div key={pUid} className={cn("flex items-center gap-2 p-2 rounded-lg bg-surface-base/50", pUid === uid && "ring-1 ring-neon-cyan bg-neon-cyan/10")}>
              <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-xs overflow-hidden ring-1 ring-white/10">
                {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : <span className="text-white/30">{p.displayName?.[0] || "?"}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{p.displayName}</p>
                <p className="text-xs text-white/20">Lv.{p.level}</p>
              </div>
              {pUid === uid && <span className="text-xs text-neon-cyan">나</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
