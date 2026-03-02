// src/hooks/useGame.ts
"use client";

import { useEffect, useState } from "react";
import { ref, onValue, off } from "firebase/database";
import { realtimeDb } from "@/lib/firebase/config";
import type { RealtimeGameState } from "@/types/game";

interface UseGameReturn {
  gameState: RealtimeGameState | null;
  isLoading: boolean;
  participantMap: Record<
    string,
    {
      displayName: string;
      photoURL: string | null;
      level: number;
      alive: boolean;
      eliminatedRound?: number;
    }
  >;
  myMatch: { matchId: string; opponentId: string } | null;
}

export function useGame(roomId: string, uid: string | null): UseGameReturn {
  const [gameState, setGameState] = useState<RealtimeGameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [participantMap, setParticipantMap] = useState<UseGameReturn["participantMap"]>({});
  const [myMatch, setMyMatch] = useState<UseGameReturn["myMatch"]>(null);

  // 게임 상태 실시간 구독
  useEffect(() => {
    const gameRef = ref(realtimeDb, `games/${roomId}/current`);
    onValue(gameRef, (snap) => {
      if (snap.exists()) {
        setGameState(snap.val() as RealtimeGameState);
      } else {
        setGameState(null);
      }
      setIsLoading(false);
    });

    return () => off(gameRef);
  }, [roomId]);

  // 참가자 목록 구독
  useEffect(() => {
    const partRef = ref(realtimeDb, `games/${roomId}/participants`);
    onValue(partRef, (snap) => {
      if (snap.exists()) {
        setParticipantMap(snap.val());
      } else {
        setParticipantMap({});
      }
    });

    return () => off(partRef);
  }, [roomId]);

  // 내 매치 정보 구독
  useEffect(() => {
    if (!uid) {
      setMyMatch(null);
      return;
    }

    const matchRef = ref(realtimeDb, `games/${roomId}/playerMatch/${uid}`);
    onValue(matchRef, (snap) => {
      if (snap.exists()) {
        setMyMatch(snap.val());
      } else {
        setMyMatch(null);
      }
    });

    return () => off(matchRef);
  }, [roomId, uid]);

  return { gameState, isLoading, participantMap, myMatch };
}
