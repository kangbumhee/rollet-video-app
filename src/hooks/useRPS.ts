// src/hooks/useRPS.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import { ref, onValue, off } from "firebase/database";
import { realtimeDb } from "@/lib/firebase/config";
import { apiClient } from "@/lib/api";
import type { RPSChoice } from "@/types/game";

interface UseRPSReturn {
  myChoice: RPSChoice | null;
  isSubmitting: boolean;
  opponentChoice: RPSChoice | null;
  matchResult: {
    player1Choice: RPSChoice;
    player2Choice: RPSChoice;
    winnerId: string;
    result: "player1" | "player2" | "draw";
    player1Id?: string;
    player2Id?: string;
  } | null;
  submitChoice: (choice: RPSChoice) => Promise<void>;
  error: string | null;
}

export function useRPS(
  roomId: string,
  sessionId: string | undefined,
  matchId: string | undefined,
  uid: string | null,
  currentRound: number
): UseRPSReturn {
  const [myChoice, setMyChoice] = useState<RPSChoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [opponentChoice, setOpponentChoice] = useState<RPSChoice | null>(null);
  const [matchResult, setMatchResult] = useState<UseRPSReturn["matchResult"]>(null);
  const [error, setError] = useState<string | null>(null);

  // 라운드 변경 시 초기화
  useEffect(() => {
    setMyChoice(null);
    setOpponentChoice(null);
    setMatchResult(null);
    setError(null);
  }, [currentRound]);

  // 매치 결과 구독
  useEffect(() => {
    if (!matchId) return;

    const resultRef = ref(realtimeDb, `games/${roomId}/current/matchResults/${matchId}`);
    onValue(resultRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setMatchResult(data);
        if (uid) {
          const opponent = uid === data.player1Id ? data.player2Choice : data.player1Choice;
          setOpponentChoice(opponent || null);
        }
      }
    });

    return () => off(resultRef);
  }, [roomId, matchId, uid]);

  const submitChoice = useCallback(
    async (choice: RPSChoice) => {
      if (!sessionId || !matchId || !uid) return;
      if (myChoice) return; // 이미 선택함

      setIsSubmitting(true);
      setError(null);

      try {
        const res = await apiClient("/api/game/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            roomId,
            matchId,
            roundNumber: currentRound,
            type: "rps_choice",
            payload: { choice },
          }),
        });

        const data = (await res.json()) as { success?: boolean; error?: string };
        if (data.success) {
          setMyChoice(choice);
        } else {
          setError(data.error || "선택 실패");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [sessionId, roomId, matchId, uid, myChoice, currentRound]
  );

  return { myChoice, isSubmitting, opponentChoice, matchResult, submitChoice, error };
}
