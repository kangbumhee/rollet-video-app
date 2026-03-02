// src/components/game/rps/RPSBattle.tsx
"use client";

import React from "react";
import type { RPSChoice } from "@/types/game";

const CHOICE_EMOJI: Record<RPSChoice, string> = {
  rock: "✊",
  scissors: "✌️",
  paper: "🖐️",
};

interface RPSBattleProps {
  myName: string;
  myPhoto: string | null;
  myChoice: RPSChoice | null;
  opponentName: string;
  opponentPhoto: string | null;
  opponentChoice: RPSChoice | null;
  isOpponentBot: boolean;
}

export function RPSBattle({
  myName,
  myPhoto,
  myChoice,
  opponentName,
  opponentPhoto,
  opponentChoice,
  isOpponentBot,
}: RPSBattleProps) {
  return (
    <div className="flex items-center justify-center gap-6 w-full max-w-sm">
      {/* 내 캐릭터 */}
      <div className="flex flex-col items-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-gray-700 border-2 border-yellow-500 overflow-hidden">
          {myPhoto ? (
            <img src={myPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">{myName[0]}</div>
          )}
        </div>
        <span className="text-xs text-gray-400 truncate max-w-[80px]">{myName}</span>
        <div className="w-16 h-16 rounded-xl bg-gray-800/80 flex items-center justify-center">
          {myChoice ? <span className="text-3xl">{CHOICE_EMOJI[myChoice]}</span> : <span className="text-3xl animate-bounce">❓</span>}
        </div>
      </div>

      {/* VS */}
      <div className="flex flex-col items-center">
        <span className="text-2xl font-black text-yellow-500">VS</span>
      </div>

      {/* 상대 캐릭터 */}
      <div className="flex flex-col items-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-gray-700 border-2 border-red-500 overflow-hidden">
          {isOpponentBot ? (
            <div className="w-full h-full flex items-center justify-center text-lg">🤖</div>
          ) : opponentPhoto ? (
            <img src={opponentPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">{opponentName[0]}</div>
          )}
        </div>
        <span className="text-xs text-gray-400 truncate max-w-[80px]">{isOpponentBot ? "🤖 봇" : opponentName}</span>
        <div className="w-16 h-16 rounded-xl bg-gray-800/80 flex items-center justify-center">
          {opponentChoice ? (
            <span className="text-3xl">{CHOICE_EMOJI[opponentChoice]}</span>
          ) : (
            <span className="text-3xl animate-bounce">❓</span>
          )}
        </div>
      </div>
    </div>
  );
}
