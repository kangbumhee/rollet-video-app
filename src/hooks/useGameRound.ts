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
  // ★ 이미 자동 제출한 라운드를 추적하여 중복 제출 방지
  const autoSubmittedRoundRef = useRef<number>(0);

  // ── Presence 관리 ──
  useEffect(() => {
    if (!uid) return;
    const presRef = ref(realtimeDb, `games/${roomId}/presence/${uid}`);

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

    return () => { off(currentRef); };
  }, [uid, roomId]);

  // ── 라운드 데이터 + 내 액션 구독 ──
  useEffect(() => {
    if (!uid || state.round === 0) return;

    // 라운드가 변경되면 자동 제출 추적 초기화
    autoSubmittedRoundRef.current = 0;

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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (state.phase !== 'playing' || !uid) return;

    // ★ roundEndsAt가 유효하지 않으면 (0이거나 너무 과거) 타이머를 시작하지 않음
    // 서버가 아직 roundEndsAt를 세팅하지 않은 상태
    if (!state.roundEndsAt || state.roundEndsAt < 1000000000000) {
      // timestamp가 너무 작으면 (밀리초 기준 2001년 이전) 유효하지 않음
      return;
    }

    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((state.roundEndsAt - now) / 1000));
      setState((prev) => ({ ...prev, timeLeft: left }));

      // 클라이언트 자동 제출 (타임아웃)
      if (left <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // ★ 이 라운드에서 이미 자동 제출했으면 스킵
        if (autoSubmittedRoundRef.current === state.round) return;

        setState((prev) => {
          if (!prev.submitted && uid && prev.round > 0) {
            // ★ 중복 방지: 이 라운드를 자동 제출 완료로 표시
            autoSubmittedRoundRef.current = prev.round;
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

    tick();
    timerRef.current = setInterval(tick, 200);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.phase, state.roundEndsAt, state.round, uid, roomId]);

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
