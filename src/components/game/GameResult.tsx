"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import type { GameType } from "@/types/game";

interface GameResultProps {
  roomId: string; winnerId?: string;
  participantMap: Record<string, { displayName: string; photoURL: string | null; level: number; alive: boolean }>;
  gameType: GameType; gameName: string;
}

export function GameResult({ roomId, winnerId, participantMap, gameType, gameName }: GameResultProps) {
  void roomId; void gameType;
  const winner = winnerId ? participantMap[winnerId] : null;

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <div className="relative">
        <span className="text-7xl animate-bounce">🏆</span>
        <div className="absolute -inset-4 animate-spin-slow opacity-30">✨🎉🎊✨🎉🎊</div>
      </div>

      <h2 className="text-2xl font-black text-white">🎉 우승자 발표!</h2>
      <p className="text-sm text-white/30">{gameName} 최종 우승</p>

      {winner ? (
        <div className="flex flex-col items-center space-y-3 bg-gradient-to-b from-neon-amber/10 to-transparent p-6 rounded-2xl">
          <div className="w-20 h-20 rounded-full bg-surface-elevated border-4 border-neon-amber overflow-hidden neon-glow-amber">
            {winner.photoURL ? (
              <img src={winner.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-white/30">{winner.displayName?.[0] || "?"}</div>
            )}
          </div>
          <p className="text-xl font-bold text-white">{winner.displayName}</p>
          <Badge className="bg-neon-amber/20 text-neon-amber border-neon-amber/30">Lv.{winner.level}</Badge>
        </div>
      ) : (
        <p className="text-white/30">우승자 정보를 불러오는 중...</p>
      )}

      <p className="text-sm text-white/20 mt-4">경품 수령 안내가 곧 진행됩니다</p>
    </div>
  );
}
