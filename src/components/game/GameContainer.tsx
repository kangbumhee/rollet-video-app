"use client";

import React, { Suspense, useMemo } from "react";
import dynamic from "next/dynamic";
import { useGame } from "@/hooks/useGame";
import { getGamePlugin } from "@/lib/game/registry";
import { GameLobby } from "./GameLobby";
import { GameResult } from "./GameResult";
import { GameCountdown } from "./GameCountdown";
import type { GameType } from "@/types/game";

interface GameContainerProps {
  roomId: string; uid: string | null; displayName: string; photoURL?: string; level: number;
}

export interface GameComponentProps {
  roomId: string; uid: string | null; sessionId?: string; currentRound: number;
  matchId?: string; opponentId?: string;
  participantMap: Record<string, { displayName: string; photoURL: string | null; level: number; alive: boolean; eliminatedRound?: number }>;
}

const GAME_COMPONENTS: Record<GameType, React.ComponentType<GameComponentProps>> = {
  rps: dynamic<GameComponentProps>(() => import("./rps/RPSGame"), { loading: () => <GameLoadingSpinner />, ssr: false }),
  roulette: dynamic<GameComponentProps>(() => import("./roulette/RouletteGame"), { loading: () => <GameLoadingSpinner />, ssr: false }),
  oxQuiz: dynamic<GameComponentProps>(() => import("./ox/OXQuizGame"), { loading: () => <GameLoadingSpinner />, ssr: false }),
  numberGuess: dynamic<GameComponentProps>(() => import("./number/NumberGuessGame"), { loading: () => <GameLoadingSpinner />, ssr: false }),
  speedClick: dynamic<GameComponentProps>(() => import("./speed/SpeedClickGame"), { loading: () => <GameLoadingSpinner />, ssr: false }),
};

export function GameContainer({ roomId, uid, displayName, photoURL, level }: GameContainerProps) {
  const { gameState, isLoading, participantMap, myMatch } = useGame(roomId, uid);
  const plugin = useMemo(() => (gameState ? getGamePlugin(gameState.gameType) : null), [gameState]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-magenta" />
      </div>
    );
  }

  if (!gameState || gameState.phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/20">
        <span className="text-5xl mb-4">🎮</span>
        <p className="text-lg font-medium">곧 게임이 시작됩니다</p>
        <p className="text-sm mt-1 text-white/15">잠시만 기다려주세요...</p>
      </div>
    );
  }

  switch (gameState.phase) {
    case "lobby":
      return <GameLobby roomId={roomId} sessionId={gameState.sessionId} uid={uid} displayName={displayName} photoURL={photoURL} level={level} participantMap={participantMap} participantCount={gameState.participantCount} countdown={gameState.countdown} gameType={gameState.gameType} gameName={plugin?.name || "게임"} gameIcon={plugin?.icon || "🎮"} />;
    case "countdown":
      return <GameCountdown gameName={plugin?.name || "게임"} gameIcon={plugin?.icon || "🎮"} participantCount={gameState.participantCount} />;
    case "playing":
    case "round_result": {
      const GameComponent = GAME_COMPONENTS[gameState.gameType];
      if (!GameComponent) return <PlaceholderGame roomId={roomId} uid={uid} sessionId={gameState.sessionId} currentRound={0} participantMap={{}} />;
      return (
        <Suspense fallback={<GameLoadingSpinner name={plugin?.name || "게임"} />}>
          <GameComponent roomId={roomId} uid={uid} sessionId={gameState.sessionId} currentRound={gameState.currentRound} matchId={myMatch?.matchId} opponentId={myMatch?.opponentId} participantMap={participantMap} />
        </Suspense>
      );
    }
    case "final_result":
    case "completed":
      return <GameResult roomId={roomId} winnerId={gameState.winnerId} participantMap={participantMap} gameType={gameState.gameType} gameName={plugin?.name || "게임"} />;
    default:
      return null;
  }
}

function GameLoadingSpinner({ name = "게임" }: { name?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neon-magenta mb-4" />
      <p className="text-sm text-white/30">{name} 로딩 중...</p>
    </div>
  );
}

function PlaceholderGame(props: GameComponentProps) {
  void props;
  return (
    <div className="flex flex-col items-center justify-center h-64 text-white/20">
      <span className="text-5xl mb-4">🚧</span>
      <p className="text-lg font-medium">준비 중인 게임입니다</p>
      <p className="text-sm mt-1 text-white/15">곧 업데이트 예정이에요!</p>
    </div>
  );
}

export default GameContainer;
