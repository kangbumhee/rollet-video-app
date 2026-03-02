// src/components/game/GameLobby.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { GameType } from "@/types/game";

interface GameLobbyProps {
  roomId: string;
  sessionId: string;
  uid: string | null;
  displayName: string;
  photoURL?: string;
  level: number;
  participantMap: Record<
    string,
    {
      displayName: string;
      photoURL: string | null;
      level: number;
      alive: boolean;
    }
  >;
  participantCount: number;
  countdown: number;
  gameType: GameType;
  gameName: string;
  gameIcon: string;
}

export function GameLobby({
  roomId,
  sessionId,
  uid,
  displayName,
  photoURL,
  level,
  participantMap,
  participantCount,
  countdown,
  gameType,
  gameName,
  gameIcon,
}: GameLobbyProps) {
  void gameType;
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lobbyCountdown, setLobbyCountdown] = useState(countdown);

  // 이미 참가했는지 확인
  useEffect(() => {
    if (uid && participantMap[uid]) {
      setHasJoined(true);
    }
  }, [uid, participantMap]);

  // 카운트다운
  useEffect(() => {
    setLobbyCountdown(countdown);
    const interval = setInterval(() => {
      setLobbyCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleJoin = async () => {
    if (!uid) {
      setError("로그인이 필요합니다.");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const res = await apiClient("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          roomId,
          displayName,
          photoURL,
          level,
        }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setHasJoined(true);
      } else {
        setError(data.error || "참가 실패");
      }
    } catch {
      setError("참가 중 오류가 발생했습니다.");
    } finally {
      setIsJoining(false);
    }
  };

  const participants = Object.entries(participantMap);

  return (
    <div className="flex flex-col items-center p-6 space-y-6">
      {/* 게임 헤더 */}
      <div className="text-center">
        <span className="text-6xl block mb-3 animate-bounce">{gameIcon}</span>
        <h2 className="text-2xl font-bold text-white">{gameName}</h2>
        <p className="text-sm text-gray-400 mt-1">참가자를 모집하고 있습니다</p>
      </div>

      {/* 카운트다운 */}
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" fill="none" className="text-gray-700" />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeDasharray={`${(lobbyCountdown / 30) * 283} 283`}
            strokeLinecap="round"
            className="text-yellow-500 transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{lobbyCountdown}</span>
        </div>
      </div>

      {/* 참가 버튼 */}
      {!hasJoined ? (
        <Button
          onClick={handleJoin}
          disabled={isJoining || !uid || lobbyCountdown <= 0}
          className="w-full max-w-xs bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 text-lg"
          size="lg"
        >
          {isJoining ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              참가 중...
            </span>
          ) : uid ? (
            "🎮 참가하기"
          ) : (
            "로그인 후 참가 가능"
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-2 text-green-400">
          <span className="text-xl">✅</span>
          <span className="font-medium">참가 완료! 게임 시작을 기다리세요</span>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* 참가자 수 */}
      <div className="text-center">
        <Badge variant="outline" className="text-lg px-4 py-1">
          👥 {participantCount}명 참가 중
        </Badge>
      </div>

      {/* 참가자 목록 */}
      <div className="w-full max-w-md">
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto hide-scrollbar">
          {participants.map(([pUid, p]) => (
            <div
              key={pUid}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg bg-gray-800/50",
                pUid === uid && "ring-1 ring-yellow-500 bg-yellow-900/20"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs overflow-hidden">
                {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : <span>{p.displayName?.[0] || "?"}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{p.displayName}</p>
                <p className="text-xs text-gray-500">Lv.{p.level}</p>
              </div>
              {pUid === uid && <span className="text-xs text-yellow-400">나</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
