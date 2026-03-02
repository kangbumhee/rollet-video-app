// src/components/game/rps/RPSRoundResult.tsx
"use client";

import React from "react";
import type { RPSChoice } from "@/types/game";

const CHOICE_EMOJI: Record<RPSChoice, string> = {
  rock: "✊",
  scissors: "✌️",
  paper: "🖐️",
};

interface RPSRoundResultProps {
  matchResult: {
    player1Choice: RPSChoice;
    player2Choice: RPSChoice;
    winnerId: string;
    result: "player1" | "player2" | "draw";
  };
  myUid: string | null;
  opponentName: string;
  currentRound: number;
  aliveCount: number;
}

export function RPSRoundResult({ matchResult, myUid, opponentName, currentRound, aliveCount }: RPSRoundResultProps) {
  const isWinner = matchResult.winnerId === myUid;
  const isDraw = matchResult.result === "draw";

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6">
      {/* 결과 이모지 */}
      <div className="text-center">
        {isDraw ? (
          <>
            <span className="text-6xl">🤝</span>
            <p className="text-xl font-bold text-yellow-400 mt-3">무승부!</p>
            <p className="text-sm text-gray-400 mt-1">둘 다 다음 라운드로 진출합니다</p>
          </>
        ) : isWinner ? (
          <>
            <span className="text-6xl animate-bounce">🎉</span>
            <p className="text-xl font-bold text-green-400 mt-3">승리!</p>
            <p className="text-sm text-gray-400 mt-1">다음 라운드로 진출합니다</p>
          </>
        ) : (
          <>
            <span className="text-6xl">😢</span>
            <p className="text-xl font-bold text-red-400 mt-3">패배...</p>
            <p className="text-sm text-gray-400 mt-1">아쉽지만 탈락입니다</p>
          </>
        )}
      </div>

      {/* 선택 비교 */}
      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">나</p>
          <span className="text-4xl">{CHOICE_EMOJI[matchResult.player1Choice]}</span>
        </div>
        <span className="text-lg text-gray-600">vs</span>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">{opponentName}</p>
          <span className="text-4xl">{CHOICE_EMOJI[matchResult.player2Choice]}</span>
        </div>
      </div>

      {/* 라운드 정보 */}
      <div className="text-center text-sm text-gray-500">
        <p>라운드 {currentRound} 종료</p>
        <p>남은 생존자: {aliveCount}명</p>
      </div>
    </div>
  );
}
