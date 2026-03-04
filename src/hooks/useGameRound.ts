'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ref, onValue, set, update, onDisconnect, off } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';
import { useAuthStore } from '@/stores/authStore';

interface RoundState {
  round: number;
  totalRounds: number;
  phase: string;
  gameType: string;
  gameName: string;
  roundEndsAt: number;
  timeLeft: number;
  myRoundScore: number;
  totalScore: number;
  submitted: boolean;
  scores: Record<string, number>;
  nameMap: Record<string, string>;
  progress: { total: number; done: number; online: number; onlineDone: number };
  roundData: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  winnerId: string | null;
  winnerName: string | null;
}

export function useGameRound(roomId: string = 'main') {
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid || null;

  const [state, setState] = useState<RoundState>({
    round: 0,
    totalRounds: 10,
    phase: 'waiting',
    gameType: '',
    gameName: '',
    roundEndsAt: 0,
    timeLeft: 0,
    myRoundScore: 0,
    totalScore: 0,
    submitted: false,
    scores: {},
    nameMap: {},
    progress: { total: 0, done: 0, online: 0, onlineDone: 0 },
    roundData: null,
    config: null,
    winnerId: null,
    winnerName: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectRef = useRef<ReturnType<typeof onDisconnect> | null>(null);

  // ── Presence 관리 (round 변경 시 onDisconnect 정리) ──
  useEffect(() => {
    if (!uid) return;
    const presRef = ref(realtimeDb, `games/${roomId}/presence/${uid}`);

    // 이전 onDisconnect 취소
    if (disconnectRef.current) {
      disconnectRef.current.cancel();
    }

    set(presRef, { online: true, lastSeen: Date.now(), currentRound: state.round });

    const dc = onDisconnect(presRef);
    dc.update({ online: false, lastSeen: Date.now() });
    disconnectRef.current = dc;

    const handleVisibility = () => {
      if (document.hidden) {
        update(presRef, { online: false, lastSeen: Date.now() });
      } else {
        update(presRef, { online: true, lastSeen: Date.now(), currentRound: state.round });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (disconnectRef.current) {
        disconnectRef.current.cancel();
        disconnectRef.current = null;
      }
    };
  }, [uid, state.round, roomId]);

  // ── current 구독 ──
  useEffect(() => {
    if (!uid) return;
    const currentRef = ref(realtimeDb, `games/${roomId}/current`);

    onValue(currentRef, (snap) => {
      if (!snap.exists()) return;
      const d = snap.val();

      setState((prev) => ({
        ...prev,
        round: d.round ?? 0,
        totalRounds: d.totalRounds ?? 10,
        phase: d.phase ?? 'waiting',
        gameType: d.gameType ?? d.config?.type ?? '',
        gameName: d.gameName ?? '',
        roundEndsAt: d.roundEndsAt ?? 0,
        totalScore: d.scores?.[uid] ?? 0,
        scores: d.scores ?? {},
        nameMap: d.nameMap ?? {},
        config: d.config ?? null,
        winnerId: d.winnerId ?? null,
        winnerName: d.winnerName ?? null,
        progress: d.roundProgress ?? prev.progress,
      }));
    });

    return () => off(currentRef);
  }, [uid, roomId]);

  // ── 라운드 데이터 + 내 액션 구독 ──
  useEffect(() => {
    if (!uid || state.round === 0) return;

    const roundRef = ref(realtimeDb, `games/${roomId}/rounds/round${state.round}`);
    const actionRef = ref(realtimeDb, `games/${roomId}/roundActions/round${state.round}/${uid}`);

    onValue(roundRef, (snap) => {
      if (snap.exists()) setState((prev) => ({ ...prev, roundData: snap.val() }));
    });

    onValue(actionRef, (snap) => {
      if (snap.exists()) {
        const a = snap.val();
        setState((prev) => ({
          ...prev,
          submitted: a?.done === true,
          myRoundScore: a?.score ?? 0,
        }));
      } else {
        setState((prev) => ({ ...prev, submitted: false, myRoundScore: 0 }));
      }
    });

    return () => { off(roundRef); off(actionRef); };
  }, [uid, state.round, roomId]);

  // ── 타이머 ──
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (state.phase !== 'playing' || !uid) return;

    const tick = () => {
      const left = Math.max(0, Math.floor((state.roundEndsAt - Date.now()) / 1000));
      setState((prev) => ({ ...prev, timeLeft: left }));

      // 클라이언트 자동 제출 (타임아웃)
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setState((prev) => {
          if (!prev.submitted && uid) {
            set(ref(realtimeDb, `games/${roomId}/roundActions/round${prev.round}/${uid}`), {
              done: true,
              score: 0,
              submittedAt: Date.now(),
              timedOut: true,
            }).catch(() => {});
          }
          return prev;
        });
      }
    };

    tick(); // 즉시 한 번 실행
    timerRef.current = setInterval(tick, 200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.phase, state.roundEndsAt, uid, roomId]);

  // ── 제출 함수 ──
  const submitAction = useCallback(
    async (score: number, extraData?: Record<string, unknown>) => {
      if (!uid || state.submitted) return;
      await set(ref(realtimeDb, `games/${roomId}/roundActions/round${state.round}/${uid}`), {
        done: true,
        score: Math.round(score),
        submittedAt: Date.now(),
        timedOut: false,
        ...(extraData ?? {}),
      });
    },
    [uid, state.round, state.submitted, roomId]
  );

  return { ...state, submitAction, uid };
}
