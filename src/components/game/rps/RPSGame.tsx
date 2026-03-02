// src/components/game/rps/RPSGame.tsx
"use client";

import React from "react";
import { useRPS } from "@/hooks/useRPS";
import { useGame } from "@/hooks/useGame";
import { useGameCountdown } from "@/hooks/useGameCountdown";
import { RPSChoiceButton } from "./RPSChoiceButton";
import { RPSBattle } from "./RPSBattle";
import { RPSTournamentBracket } from "./RPSTournamentBracket";
import { RPSRoundResult } from "./RPSRoundResult";
import type { GameComponentProps } from "../GameContainer";
import type { RPSChoice } from "@/types/game";

function RPSGame({ roomId, uid, sessionId, currentRound, matchId, opponentId, participantMap }: GameComponentProps) {
  const { gameState } = useGame(roomId, uid);
  const { myChoice, isSubmitting, opponentChoice, matchResult, submitChoice, error } = useRPS(
    roomId,
    sessionId,
    matchId,
    uid,
    currentRound
  );

  const { remaining, isExpired } = useGameCountdown({
    targetTime: gameState?.roundEndsAt || 0,
    enabled: gameState?.phase === "playing",
  });

  const opponentInfo = opponentId
    ? participantMap[opponentId] || { displayName: "🤖 봇", photoURL: null, level: 0, alive: true }
    : null;

  const myInfo = uid ? participantMap[uid] || { displayName: "나", photoURL: null, level: 0, alive: true } : null;

  // 탈락한 경우
  if (uid && participantMap[uid] && !participantMap[uid].alive) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <span className="text-5xl">😢</span>
        <p className="text-lg text-gray-400">아쉽게도 탈락하셨습니다</p>
        <p className="text-sm text-gray-500">라운드 {participantMap[uid]?.eliminatedRound || currentRound}에서 탈락</p>
        <p className="text-xs text-gray-600">남은 경기를 관전하세요!</p>
      </div>
    );
  }

  // 라운드 결과 표시
  if (gameState?.phase === "round_result" && matchResult) {
    return (
      <RPSRoundResult
        matchResult={matchResult}
        myUid={uid}
        opponentName={opponentInfo?.displayName || "상대"}
        currentRound={currentRound}
        aliveCount={gameState.aliveCount}
      />
    );
  }

  return (
    <div className="flex flex-col items-center p-4 space-y-6">
      {/* 라운드 정보 */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <span className="text-sm text-gray-400">라운드 {currentRound}</span>
        <span className="text-sm text-gray-400">생존 {gameState?.aliveCount || 0}명</span>
      </div>

      {/* 타이머 */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-700" />
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${(remaining / 5) * 264} 264`}
            strokeLinecap="round"
            className={remaining <= 2 ? "text-red-500" : "text-yellow-500"}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${remaining <= 2 ? "text-red-500 animate-pulse" : "text-white"}`}>{remaining}</span>
        </div>
      </div>

      {/* 대전 화면 */}
      <RPSBattle
        myName={myInfo?.displayName || "나"}
        myPhoto={myInfo?.photoURL || null}
        myChoice={myChoice}
        opponentName={opponentInfo?.displayName || "상대"}
        opponentPhoto={opponentInfo?.photoURL || null}
        opponentChoice={opponentChoice}
        isOpponentBot={opponentId === "BOT"}
      />

      {/* 선택 버튼 */}
      {!myChoice && !isExpired ? (
        <div className="flex gap-4">
          {(["rock", "scissors", "paper"] as RPSChoice[]).map((choice) => (
            <RPSChoiceButton
              key={choice}
              choice={choice}
              onClick={() => submitChoice(choice)}
              disabled={isSubmitting}
              isSelected={false}
            />
          ))}
        </div>
      ) : myChoice ? (
        <div className="text-center">
          <p className="text-sm text-green-400">✅ 선택 완료!</p>
          <p className="text-xs text-gray-500 mt-1">상대의 선택을 기다리는 중...</p>
        </div>
      ) : (
        <p className="text-sm text-red-400">⏰ 시간 초과 - 자동 선택됩니다</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* 토너먼트 대진표 (축소) */}
      <RPSTournamentBracket participantMap={participantMap} currentRound={currentRound} />
    </div>
  );
}

export default RPSGame;
