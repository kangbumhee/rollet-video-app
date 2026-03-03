'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ref, onValue, set, get, push, update } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';
import DrawingCanvas from '@/components/game/canvas/DrawingCanvas';
import LineRunnerGame from '@/components/game/canvas/LineRunnerGame';
import { soundManager } from '@/lib/sounds/SoundManager';

interface GameCurrent {
  gameType: string;
  gameName: string;
  phase: string;
  introStartedAt?: number;
  round: number;
  totalRounds: number;
  totalPlayers: number;
  scores: Record<string, number>;
  nameMap: Record<string, string>;
  alive: Record<string, boolean>;
  startedAt: number;
  startedBy?: string;
  config?: Record<string, unknown>;
  isAutoGame?: boolean;
  reward?: { type: string; amount: number; label: string };
  rewardDistributed?: boolean;
}

interface RegularGamePlayerProps {
  roomId: string;
  uid: string;
  displayName: string;
}

export default function RegularGamePlayer({ roomId, uid, displayName }: RegularGamePlayerProps) {
  const [current, setCurrent] = useState<GameCurrent | null>(null);
  const [roundData, setRoundData] = useState<Record<string, unknown> | null>(null);
  const [myChoice, setMyChoice] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [roundResult, setRoundResult] = useState('');
  const [rankings, setRankings] = useState<Array<{ uid: string; name: string; score: number }>>([]);

  const [strokes, setStrokes] = useState<Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }>>([]);
  const [guessInput, setGuessInput] = useState('');
  const [typingInput, setTypingInput] = useState('');
  const [typingStartTime, setTypingStartTime] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const [myBid, setMyBid] = useState(0);
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [allBids, setAllBids] = useState<Record<string, { bid: number; displayName: string }>>({});
  const [chestRevealed, setChestRevealed] = useState(false);
  const [chipsMap, setChipsMap] = useState<Record<string, number>>({});
  const [auctionPhase, setAuctionPhase] = useState<'bidding' | 'reveal' | 'result'>('bidding');
  const [auctionResult, setAuctionResult] = useState<{
    winnerId: string | null;
    winnerName: string | null;
    chest: { type: string; label: string; points: number; special?: string };
    message: string;
    allBids: Array<{ uid: string; bid: number; name: string }>;
  } | null>(null);
  const [nunchiClaimed, setNunchiClaimed] = useState<Record<string, number>>({});
  const [myNunchiNumber, setMyNunchiNumber] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [forgeLevel, setForgeLevel] = useState(0);
  const [forgeLog, setForgeLog] = useState<Array<{ action: string; result: 'success' | 'fail' | 'down' | 'destroy'; fromLevel: number; toLevel: number }>>([]);
  const [forgeAnimating, setForgeAnimating] = useState(false);
  const [forgePerfect, setForgePerfect] = useState(false);
  const [forgeStreak, setForgeStreak] = useState(0);
  const [otherForge, setOtherForge] = useState<Record<string, { level: number; displayName: string }>>({});
  const [lineDistance, setLineDistance] = useState(0);
  const [oxRevealed, setOxRevealed] = useState(false);
  const [touchScore, setTouchScore] = useState(0);
  const [activeTarget, setActiveTarget] = useState<{ x: number; y: number; id: number } | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());
  const [isLeader, setIsLeader] = useState(false);

  const [rouletteCoins, setRouletteCoins] = useState(500);
  const [rouletteBets, setRouletteBets] = useState<Record<number, number>>({});
  const [rouletteSelectedMult, setRouletteSelectedMult] = useState<number | null>(null);
  const [roulettePhase, setRoulettePhase] = useState<'betting' | 'spinning' | 'result'>('betting');
  const [rouletteWinIdx, setRouletteWinIdx] = useState(-1);
  const [rouletteResultMsg, setRouletteResultMsg] = useState('');
  const [rouletteOtherCoins, setRouletteOtherCoins] = useState<Record<string, number>>({});
  const rouletteCanvasRef = useRef<HTMLCanvasElement>(null);
  const rouletteSpinningRef = useRef(false);
  const rouletteAnimRef = useRef(0);
  const rouletteAngleRef = useRef(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scoreSubmittedRef = useRef(false);
  const lastTransitionedRoundRef = useRef<number>(0);
  const advanceRoundCalledRef = useRef(false);
  const finalSoundPlayedRef = useRef(false);
  const lineRunSoundRoundRef = useRef('');
  const quickTouchTimersRef = useRef<NodeJS.Timeout[]>([]);
  const quickTouchStartTimeRef = useRef<number>(0);
  const absentHandledRef = useRef<string>('');

  useEffect(() => {
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/current`), (snap) => {
      if (snap.exists()) setCurrent(snap.val() as GameCurrent);
      else setCurrent(null);
    });
    return () => unsub();
  }, [roomId]);

  // 게임 참가자 presence 감지
  useEffect(() => {
    if (!roomId) return;
    const presRef = ref(realtimeDb, `rooms/${roomId}/presence`);
    const unsub = onValue(presRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val() as Record<string, { uid: string }>;
        setOnlinePlayers(new Set(Object.keys(data)));
      } else {
        setOnlinePlayers(new Set());
      }
    });
    return () => unsub();
  }, [roomId]);

  // 리더 자동 승계: startedBy가 오프라인이면 남은 참가자 중 첫 번째가 리더
  useEffect(() => {
    if (!current || !uid) {
      setIsLeader(false);
      return;
    }
    const startedBy = current.startedBy;
    if (startedBy && onlinePlayers.has(startedBy)) {
      setIsLeader(startedBy === uid);
      return;
    }
    const alivePlayers = Object.keys(current.alive || {}).filter((id) => onlinePlayers.has(id)).sort();
    const newLeader = alivePlayers[0] || null;
    setIsLeader(newLeader === uid);
    if (newLeader === uid && startedBy && !onlinePlayers.has(startedBy)) {
      void set(ref(realtimeDb, `games/${roomId}/current/startedBy`), uid);
    }
  }, [current?.startedBy, current?.alive, onlinePlayers, uid, roomId]);

  useEffect(() => {
    if (!current || current.round < 1) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/rounds/round${current.round}`), (snap) => {
      if (snap.exists()) {
        const data = snap.val() as Record<string, unknown>;
        setRoundData(data);
        setMyChoice(null);
        scoreSubmittedRef.current = false;
        advanceRoundCalledRef.current = false;
        setShowResult(false);
        setRoundResult('');
        setTypingInput('');
        setTypingDone(false);
        setTypingStartTime(Date.now());
        setMyBid(0);
        setBidSubmitted(false);
        setAllBids({});
        setChestRevealed(false);
        setAuctionPhase('bidding');
        setAuctionResult(null);
        setMyNunchiNumber(null);
        setNunchiClaimed({});
        setPriceInput('');
        setForgeLevel(0);
        setForgeLog([]);
        setForgeAnimating(false);
        setForgePerfect(false);
        setForgeStreak(0);
        setLineDistance(0);
        setOxRevealed(false);
        setTouchScore(0);
        setActiveTarget(null);
        quickTouchTimersRef.current.forEach(clearTimeout);
        quickTouchTimersRef.current = [];
        setRouletteBets({});
        setRouletteSelectedMult(null);
        setRoulettePhase('betting');
        setRouletteWinIdx(-1);
        setRouletteResultMsg('');
        rouletteSpinningRef.current = false;
        rouletteAngleRef.current = 0;
        if (rouletteAnimRef.current) cancelAnimationFrame(rouletteAnimRef.current);
        setStrokes([]);
        setGuessInput('');

        const tl = (data.timeLimit as number) || (data.duration as number) || (data.discussionTime as number) || 15;
        setTimeLeft(tl);
      }
    });
    return () => unsub();
  }, [roomId, current?.round]);

  useEffect(() => {
    if (!current || current.phase !== 'round_playing') return;
    if (!roundData || timeLeft <= 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          void handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current?.phase, roundData, current?.round, timeLeft]);

  // game_intro -> round_waiting phase is handled on client
  useEffect(() => {
    if (!current || !uid) return;
    if (current.phase !== 'game_intro') return;
    if (!isLeader) return;

    if (current.round <= 1) {
      lastTransitionedRoundRef.current = 0;
    }

    const elapsed = Date.now() - (current.introStartedAt || Date.now());
    const remaining = Math.max(0, 3000 - elapsed);

    const timer = setTimeout(async () => {
      try {
        const phaseSnap = await get(ref(realtimeDb, `games/${roomId}/current/phase`));
        if (phaseSnap.val() !== 'game_intro') return;

        await update(ref(realtimeDb, `games/${roomId}/current`), {
          phase: 'round_waiting',
          round: 1,
        });
      } catch (err) {
        console.error('[RegularGamePlayer] Intro transition error:', err);
      }
    }, remaining);

    return () => clearTimeout(timer);
  }, [current?.phase, isLeader, current?.introStartedAt, uid, roomId]);

  // round_waiting -> round_playing phase is handled on client
  useEffect(() => {
    if (!current || !uid) return;
    if (current.phase !== 'round_waiting') return;
    if (!isLeader) return;
    if (current.round < 1) return;

    const timer = setTimeout(async () => {
      try {
        const phaseSnap = await get(ref(realtimeDb, `games/${roomId}/current/phase`));
        if (phaseSnap.val() !== 'round_waiting') return;

        await update(ref(realtimeDb, `games/${roomId}/current`), {
          phase: 'round_playing',
        });
      } catch (err) {
        console.error('[RegularGamePlayer] round_waiting transition error:', err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [current?.phase, current?.round, isLeader, uid, roomId]);

  // round_result -> next round_waiting/final_result transition is handled on client
  useEffect(() => {
    if (!current || !uid) return;
    if (current.phase !== 'round_result') return;
    if (!isLeader) return;
    if (lastTransitionedRoundRef.current >= current.round) return;

    const roundAtStart = current.round;
    const totalAtStart = current.totalRounds;

    const timer = setTimeout(async () => {
      try {
        const phaseSnap = await get(ref(realtimeDb, `games/${roomId}/current/phase`));
        if (phaseSnap.val() !== 'round_result') return;

        lastTransitionedRoundRef.current = roundAtStart;

        if (roundAtStart >= totalAtStart) {
          await update(ref(realtimeDb, `games/${roomId}/current`), {
            phase: 'final_result',
          });
          return;
        }

        await update(ref(realtimeDb, `games/${roomId}/current`), {
          phase: 'round_waiting',
          round: roundAtStart + 1,
        });
      } catch (err) {
        console.error('[RegularGamePlayer] Round transition error:', err);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [current?.phase, current?.round, current?.totalRounds, isLeader, uid, roomId]);

  useEffect(() => {
    if (!current?.scores || !current?.nameMap) return;
    const sorted = Object.entries(current.scores)
      .map(([id, score]) => ({ uid: id, name: current.nameMap[id] || id.slice(0, 6), score }))
      .sort((a, b) => b.score - a.score);
    setRankings(sorted);
  }, [current?.scores, current?.nameMap]);

  useEffect(() => {
    if (!current) return;
    if (current.phase === 'final_result') {
      if (!finalSoundPlayedRef.current) {
        finalSoundPlayedRef.current = true;
        soundManager.play('win-fanfare');
        soundManager.playBGM('bgm-winner');
      }
      return;
    }
    finalSoundPlayedRef.current = false;
  }, [current?.phase, current]);

  const rewardCalledRef = useRef(false);
  useEffect(() => {
    if (!current || !uid) return;
    if (current.phase !== 'final_result') {
      rewardCalledRef.current = false;
      return;
    }
    if (!current.isAutoGame) return;
    if (current.rewardDistributed) return;
    if (rewardCalledRef.current) return;
    if (!isLeader) return;

    rewardCalledRef.current = true;

    const callReward = async () => {
      try {
        await fetch(`/api/room/${roomId}/reward-points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: 'auto-game-secret-key' }),
        });
      } catch (err) {
        console.error('[RegularGamePlayer] Reward API error:', err);
      }
    };
    void callReward();
  }, [current?.phase, current?.isAutoGame, current?.rewardDistributed, isLeader, uid, roomId]);

  // final_result 15초 후 자동 게임 정리 (리더만 실행)
  const finalCleanupCalledRef = useRef(false);
  useEffect(() => {
    if (!current || !uid) return;
    if (current.phase !== 'final_result') {
      finalCleanupCalledRef.current = false;
      return;
    }
    if (!isLeader) return;
    if (finalCleanupCalledRef.current) return;

    const timer = setTimeout(async () => {
      if (finalCleanupCalledRef.current) return;
      finalCleanupCalledRef.current = true;
      try {
        const phaseSnap = await get(ref(realtimeDb, `games/${roomId}/current/phase`));
        if (phaseSnap.val() !== 'final_result') return;
        await set(ref(realtimeDb, `games/${roomId}`), null);
      } catch (err) {
        console.error('[RegularGamePlayer] Final cleanup error:', err);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [current?.phase, isLeader, uid, roomId]);

  useEffect(() => {
    if (!current || current.gameType !== 'lineRunner') return;
    const key = `${current.gameType}-${current.round}`;
    if (lineRunSoundRoundRef.current === key) return;
    lineRunSoundRoundRef.current = key;
    soundManager.play('line-run');
  }, [current?.gameType, current?.round, current]);

  // weaponForge - 다른 플레이어 강화 레벨 실시간 구독
  useEffect(() => {
    if (!current || current.gameType !== 'weaponForge' || current.round < 1) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/forge/round${current.round}`), (snap) => {
      if (snap.exists()) setOtherForge(snap.val() as Record<string, { level: number; displayName: string }>);
      else setOtherForge({});
    });
    return () => unsub();
  }, [roomId, current?.gameType, current?.round]);

  // destinyAuction - 칩 실시간 구독
  useEffect(() => {
    if (!roomId) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/chips`), (snap) => {
      if (snap.exists()) setChipsMap(snap.val() as Record<string, number>);
    });
    return () => unsub();
  }, [roomId]);

  // destinyAuction - 입찰 구독
  useEffect(() => {
    if (!current || current.gameType !== 'destinyAuction' || current.round < 1) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/bids/round${current.round}`), (snap) => {
      if (snap.exists()) setAllBids(snap.val() as Record<string, { bid: number; displayName: string }>);
      else setAllBids({});
    });
    return () => unsub();
  }, [roomId, current?.gameType, current?.round]);

  // destinyAuction - 경매 결과 구독
  useEffect(() => {
    if (!current || current.gameType !== 'destinyAuction' || current.round < 1) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/auctionResult/round${current.round}`), (snap) => {
      if (snap.exists()) {
        const val = snap.val() as { winnerId: string | null; winnerName: string | null; chest: { type: string; label: string; points: number; special?: string }; message: string; allBids: Array<{ uid: string; bid: number; name: string }> };
        setAuctionResult(val);
        setAuctionPhase('result');
        setChestRevealed(true);
        soundManager.play('card-flip');
        const chest = val.chest;
        if (chest) {
          setTimeout(() => {
            if (chest.type === 'gold') soundManager.play('win-fanfare');
            else if (chest.type === 'bomb') soundManager.play('explosion');
            else if (chest.type === 'trap') soundManager.play('wrong');
            else if (chest.type === 'empty') soundManager.play('pop-up');
            else if (chest.special) soundManager.play('prize-reveal');
            else soundManager.play('cash-register');
          }, 500);
        }
      }
    });
    return () => unsub();
  }, [roomId, current?.gameType, current?.round]);

  useEffect(() => {
    if (!current || current.gameType !== 'drawGuess' || current.round < 1) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/drawing/round${current.round}`), (snap) => {
      if (snap.exists()) {
        const data = snap.val() as Record<string, unknown>;
        if (data.strokes) {
          setStrokes(Object.values(data.strokes as Record<string, unknown>) as typeof strokes);
        }
      }
    });
    return () => unsub();
  }, [roomId, current?.gameType, current?.round, current]);

  useEffect(() => {
    if (!current || current.gameType !== 'nunchiGame' || current.round < 1) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/nunchi/round${current.round}`), (snap) => {
      if (snap.exists()) setNunchiClaimed(snap.val() as Record<string, number>);
      else setNunchiClaimed({});
    });
    return () => unsub();
  }, [roomId, current?.gameType, current?.round, current]);

  // quickTouch - 타겟 생성 (round_playing에서만, current 객체 변경 시 타이머 리셋 방지)
  useEffect(() => {
    quickTouchTimersRef.current.forEach(clearTimeout);
    quickTouchTimersRef.current = [];

    if (!current || current.gameType !== 'quickTouch' || !roundData || current.round < 1) return;
    if (current.phase !== 'round_playing') return;

    quickTouchStartTimeRef.current = Date.now();
    const targets = (roundData.targets || []) as Array<{ x: number; y: number; delay: number; size: number }>;

    targets.forEach((t, i) => {
      const showTimer = setTimeout(() => {
        if (scoreSubmittedRef.current) return;
        soundManager.play('target-appear');
        setActiveTarget({ x: t.x, y: t.y, id: i });

        const hideTimer = setTimeout(() => {
          if (scoreSubmittedRef.current) return;
          setActiveTarget((prev) => {
            if (prev?.id === i) {
              soundManager.play('target-miss');
              return null;
            }
            return prev;
          });
        }, 1000);
        quickTouchTimersRef.current.push(hideTimer);
      }, t.delay);

      quickTouchTimersRef.current.push(showTimer);
    });

    return () => {
      quickTouchTimersRef.current.forEach(clearTimeout);
      quickTouchTimersRef.current = [];
    };
  }, [current?.gameType, current?.phase, current?.round, roundData]);

  useEffect(() => {
    if (!current || current.gameType !== 'bigRoulette' || !roomId) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/rouletteCoins`), (snap) => {
      if (snap.exists()) {
        const data = snap.val() as Record<string, number>;
        if (data[uid] !== undefined) setRouletteCoins(data[uid]);
        const others: Record<string, number> = {};
        Object.entries(data).forEach(([id, val]) => {
          if (id !== uid) others[id] = val;
        });
        setRouletteOtherCoins(others);
      }
    });
    return () => unsub();
  }, [roomId, current?.gameType, uid]);

  const ROULETTE_SEGMENTS = [
    { label: '×2', mult: 2, color: '#3b82f6', glow: '#60a5fa' },
    { label: '×3', mult: 3, color: '#8b5cf6', glow: '#a78bfa' },
    { label: '×1', mult: 1, color: '#6b7280', glow: '#9ca3af' },
    { label: '×5', mult: 5, color: '#f59e0b', glow: '#fbbf24' },
    { label: '×2', mult: 2, color: '#3b82f6', glow: '#60a5fa' },
    { label: '💀', mult: 0, color: '#ef4444', glow: '#f87171' },
    { label: '×3', mult: 3, color: '#8b5cf6', glow: '#a78bfa' },
    { label: '×10', mult: 10, color: '#ec4899', glow: '#f472b6' },
    { label: '×1', mult: 1, color: '#6b7280', glow: '#9ca3af' },
    { label: '×2', mult: 2, color: '#3b82f6', glow: '#60a5fa' },
    { label: '×5', mult: 5, color: '#f59e0b', glow: '#fbbf24' },
    { label: '×20', mult: 20, color: '#dc2626', glow: '#f87171' },
  ];
  const ROULETTE_SEG_ANGLE = (2 * Math.PI) / ROULETTE_SEGMENTS.length;

  const drawRouletteWheel = useCallback((currentAngle: number, highlightIdx?: number) => {
    const canvas = rouletteCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = 130;
    const SEG_COUNT = ROULETTE_SEGMENTS.length;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let i = 0; i < SEG_COUNT; i++) {
      const startA = currentAngle + i * ROULETTE_SEG_ANGLE - Math.PI / 2;
      const endA = startA + ROULETTE_SEG_ANGLE;
      const seg = ROULETTE_SEGMENTS[i];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, startA, endA);
      ctx.closePath();
      ctx.fillStyle = highlightIdx === i ? seg.glow : seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const midA = startA + ROULETTE_SEG_ANGLE / 2;
      const tx = cx + Math.cos(midA) * (R * 0.65);
      const ty = cy + Math.sin(midA) * (R * 0.65);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midA + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${seg.mult >= 10 ? 11 : 13}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(seg.label, 0, 0);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`R${current?.round ?? 1}`, cx, cy);
    ctx.beginPath();
    ctx.moveTo(cx, cy - R - 8);
    ctx.lineTo(cx - 8, cy - R - 22);
    ctx.lineTo(cx + 8, cy - R - 22);
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
  }, [current?.round]);

  const placeRouletteBet = useCallback((mult: number, amount: number) => {
    const totalBet = Object.values(rouletteBets).reduce((s, v) => s + v, 0);
    if (amount <= 0 || totalBet + amount > rouletteCoins) return;
    soundManager.play('coin-flip');
    setRouletteBets((prev) => ({ ...prev, [mult]: (prev[mult] || 0) + amount }));
  }, [rouletteBets, rouletteCoins]);

  const spinRoulette = useCallback(async () => {
    if (rouletteSpinningRef.current || !current || !roundData) return;
    setRoulettePhase('spinning');
    rouletteSpinningRef.current = true;
    soundManager.play('whoosh');
    setTimeout(() => soundManager.play('roulette-spin'), 300);

    const targetIdx = (roundData.targetSegmentIdx as number) ?? Math.floor(Math.random() * ROULETTE_SEGMENTS.length);
    await set(ref(realtimeDb, `games/${roomId}/rouletteBets/round${current.round}/${uid}`), rouletteBets);
    const targetCenterAngle = targetIdx * ROULETTE_SEG_ANGLE + ROULETTE_SEG_ANGLE / 2;
    const fullRotations = 8 + Math.floor(Math.random() * 5);
    const totalAngle = fullRotations * 2 * Math.PI + (2 * Math.PI - targetCenterAngle);
    const jitter = (Math.random() - 0.5) * ROULETTE_SEG_ANGLE * 0.6;
    const finalTotalAngle = totalAngle + jitter;
    const startAngle = rouletteAngleRef.current;
    const startTime = performance.now();
    const easing = (t: number) => 1 - Math.pow(1 - t, 4);
    let lastTickSegment = -1;

    const animate = (now: number) => {
      if (!rouletteSpinningRef.current) return;
      const elapsed = now - startTime;
      const t = Math.min(elapsed / 10000, 1);
      const eased = easing(t);
      const currentAngle = startAngle + eased * finalTotalAngle;
      rouletteAngleRef.current = currentAngle;

      if (t > 0.7) {
        const pAngle = ((-currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const currentSeg = Math.floor(pAngle / ROULETTE_SEG_ANGLE) % ROULETTE_SEGMENTS.length;
        if (currentSeg !== lastTickSegment) {
          lastTickSegment = currentSeg;
          soundManager.play('bomb-tick');
        }
      }

      let highlight: number | undefined;
      if (t > 0.85) {
        const pAngle = ((-currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        highlight = Math.floor(pAngle / ROULETTE_SEG_ANGLE) % ROULETTE_SEGMENTS.length;
      }
      drawRouletteWheel(currentAngle, highlight);
      if (t < 1) {
        rouletteAnimRef.current = requestAnimationFrame(animate);
      } else {
        rouletteSpinningRef.current = false;
        const finalNorm = ((-currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const winIdx = Math.floor(finalNorm / ROULETTE_SEG_ANGLE) % ROULETTE_SEGMENTS.length;
        setRouletteWinIdx(winIdx);
        drawRouletteWheel(currentAngle, winIdx);
        const winMult = ROULETTE_SEGMENTS[winIdx].mult;
        const baseCoins = (roundData.baseCoins as number) || 100;
        const totalBetAmount = Object.values(rouletteBets).reduce((s, v) => s + v, 0);
        let winnings = 0;
        Object.entries(rouletteBets).forEach(([mult, amt]) => {
          if (Number(mult) === winMult && winMult > 0) winnings += amt * winMult;
        });
        const myBetOnWin = rouletteBets[winMult] ?? 0;

        soundManager.play('prize-reveal');
        setTimeout(() => {
          if (winMult === 0) soundManager.play('explosion');
          else if (winMult >= 10) soundManager.play('win-fanfare');
          else if (myBetOnWin > 0) soundManager.play('cash-register');
          else soundManager.play('wrong');
        }, 400);

        const netGain = winnings - totalBetAmount + baseCoins;
        const newCoins = Math.max(0, rouletteCoins + winnings - totalBetAmount + baseCoins);
        setRouletteCoins(newCoins);
        setRouletteResultMsg(
          winnings > 0
            ? `×${winMult} 당첨! +${winnings} (기본 +${baseCoins})`
            : winMult === 0
              ? `꽝! 베팅 ${totalBetAmount} 소실 (기본 +${baseCoins})`
              : `미당첨. -${totalBetAmount} (기본 +${baseCoins})`
        );
        void set(ref(realtimeDb, `games/${roomId}/rouletteCoins/${uid}`), newCoins);
        setRoulettePhase('result');
        setTimeout(() => {
          if (!scoreSubmittedRef.current) void submitScore(netGain);
        }, 1500);
      }
    };
    rouletteAnimRef.current = requestAnimationFrame(animate);
  }, [current, roundData, roomId, uid, rouletteBets, rouletteCoins, drawRouletteWheel]);

  useEffect(() => {
    return () => {
      rouletteSpinningRef.current = false;
      if (rouletteAnimRef.current) cancelAnimationFrame(rouletteAnimRef.current);
    };
  }, []);

  useEffect(() => {
    if (current?.gameType !== 'bigRoulette' || roulettePhase !== 'betting') return;
    drawRouletteWheel(rouletteAngleRef.current);
  }, [current?.gameType, roulettePhase, drawRouletteWheel]);

  const submitScore = async (points: number) => {
    if (scoreSubmittedRef.current) return;
    scoreSubmittedRef.current = true;
    if (points > 0) soundManager.play('correct');
    else if (points < 0) soundManager.play('wrong');
    const scoreRef = ref(realtimeDb, `games/${roomId}/current/scores/${uid}`);
    const snap = await get(scoreRef);
    const cur = snap.exists() ? (snap.val() as number) : 0;
    await set(scoreRef, cur + points);
    setRoundResult(points > 0 ? `+${points}점!` : points === 0 ? '0점' : `${points}점`);
    setShowResult(true);

    await set(ref(realtimeDb, `games/${roomId}/playerChoices/round${current?.round}/${uid}`), {
      score: points, displayName, timestamp: Date.now(),
    });
  };

  const submitChoice = async (choice: string) => {
    if (myChoice !== null) return;
    setMyChoice(choice);
    await set(ref(realtimeDb, `games/${roomId}/playerChoices/round${current?.round}/${uid}`), {
      choice, displayName, timestamp: Date.now(),
    });
  };

  const submitBid = async (bidAmount: number) => {
    if (bidSubmitted || !current || !uid) return;
    const myChips = chipsMap[uid] ?? 0;
    if (bidAmount > myChips || bidAmount < 0) return;
    soundManager.play('coin-flip');
    setBidSubmitted(true);
    setMyBid(bidAmount);
    await set(ref(realtimeDb, `games/${roomId}/bids/round${current.round}/${uid}`), {
      bid: bidAmount,
      displayName,
      timestamp: Date.now(),
    });
  };

  const attemptForge = async () => {
    if (!current || !roundData || forgeAnimating || forgeLevel >= 10) return;
    if (scoreSubmittedRef.current) return;

    setForgeAnimating(true);
    soundManager.play('slot-spin');
    if (forgeLevel >= 7) soundManager.play('bomb-tick');

    const table = (roundData.enhanceTable as Array<{ success: number; fail: number; down: number; destroy: number }>)[forgeLevel];

    const myRank = rankings.findIndex((r) => r.uid === uid) + 1;
    let successBonus = 0;
    let destroyReduction = 0;
    if (myRank >= 4) {
      successBonus = 10;
      destroyReduction = 10;
    } else if (myRank === 3) {
      successBonus = 6;
      destroyReduction = 5;
    } else if (myRank === 2) {
      successBonus = 3;
      destroyReduction = 0;
    }

    const adjustedSuccess = Math.min(99, table.success + successBonus);
    const adjustedDestroy = Math.max(0, table.destroy - destroyReduction);
    const adjustedDown = table.down;
    const adjustedFail = Math.max(0, 100 - adjustedSuccess - adjustedDown - adjustedDestroy);

    const roll = Math.random() * 100;
    let result: 'success' | 'fail' | 'down' | 'destroy';
    let newLevel = forgeLevel;

    if (roll < adjustedSuccess) {
      result = 'success';
      newLevel = forgeLevel + 1;
      setForgeStreak((prev) => prev + 1);
    } else if (roll < adjustedSuccess + adjustedFail) {
      result = 'fail';
      newLevel = forgeLevel;
      setForgeStreak(0);
    } else if (roll < adjustedSuccess + adjustedFail + adjustedDown) {
      result = 'down';
      newLevel = Math.max(0, forgeLevel - 1);
      setForgeStreak(0);
    } else {
      result = 'destroy';
      newLevel = 0;
      setForgeStreak(0);
    }

    setForgeLevel(newLevel);
    setForgeLog((prev) => [
      ...prev,
      { action: `+${forgeLevel}→+${forgeLevel + 1}`, result, fromLevel: forgeLevel, toLevel: newLevel },
    ]);

    if (result === 'success') {
      if (newLevel === 10) {
        setForgePerfect(true);
        soundManager.play('win-fanfare');
      } else if (forgeStreak >= 2) {
        soundManager.play('combo');
      } else {
        soundManager.play('correct');
      }
    } else if (result === 'fail') {
      soundManager.play('wrong');
    } else if (result === 'down') {
      soundManager.play('lose');
    } else {
      soundManager.play('explosion');
    }

    await set(ref(realtimeDb, `games/${roomId}/forge/round${current.round}/${uid}`), {
      level: newLevel,
      displayName,
    });

    await new Promise((r) => setTimeout(r, 400));
    setForgeAnimating(false);
  };

  const advanceRound = useCallback(async () => {
    if (!current) return;
    if (!isLeader) return;
    if (advanceRoundCalledRef.current) return;
    advanceRoundCalledRef.current = true;
    soundManager.play('whoosh');
    await set(ref(realtimeDb, `games/${roomId}/current/phase`), 'round_result');
  }, [current, roomId, uid, isLeader]);

  // 나간 플레이어 감지 → drawer/bombHolder 라운드 강제 스킵
  useEffect(() => {
    if (!current || !roundData || !isLeader) return;
    if (current.phase !== 'round_playing') return;
    const roundKey = `${current.round}`;
    if (absentHandledRef.current === roundKey) return;

    const gt = current.gameType;
    let criticalUid: string | null = null;
    if (gt === 'drawGuess') {
      criticalUid = (roundData.drawerId as string) || null;
    }
    if (criticalUid && !onlinePlayers.has(criticalUid)) {
      absentHandledRef.current = roundKey;
      const timer = setTimeout(() => {
        if (!onlinePlayers.has(criticalUid!)) {
          void advanceRound();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [current?.phase, current?.round, current?.gameType, roundData, onlinePlayers, isLeader, advanceRound]);

  // alive에서 나간 플레이어 제거
  useEffect(() => {
    if (!current || !isLeader) return;
    if (!current.alive) return;
    const updates: Record<string, boolean> = {};
    Object.keys(current.alive).forEach((playerId) => {
      if (current!.alive[playerId] && !onlinePlayers.has(playerId)) {
        updates[playerId] = false;
      }
    });
    if (Object.keys(updates).length === 0) return;

    const aliveRef = ref(realtimeDb, `games/${roomId}/current/alive`);
    void get(aliveRef).then((snap) => {
      if (!snap.exists()) return;
      const currentAlive = snap.val() as Record<string, boolean>;
      const merged = { ...currentAlive, ...updates };
      const aliveCount = Object.values(merged).filter(Boolean).length;
      if (aliveCount < 1) {
        void set(ref(realtimeDb, `games/${roomId}/current/phase`), 'final_result');
      } else {
        void set(aliveRef, merged);
      }
    });
  }, [current?.alive, onlinePlayers, isLeader, roomId]);

  // destinyAuction: 모든 참가자 입찰 완료 시 리더가 정산 후 다음 라운드
  useEffect(() => {
    if (!current || current.gameType !== 'destinyAuction' || current.phase !== 'round_playing' || !roundData || !isLeader || auctionPhase !== 'bidding') return;
    const alivePlayerIds = Object.keys(current.alive || {}).filter((id) => current!.alive![id]);
    const bidPlayerIds = Object.keys(allBids);
    const allBidded = alivePlayerIds.length > 0 && alivePlayerIds.every((id) => bidPlayerIds.includes(id));
    if (!allBidded) return;

    setAuctionPhase('reveal');

    const processAuction = async () => {
      const chest = roundData.chest as { type: string; label: string; points: number; special?: string };
      const entries = Object.entries(allBids).map(([id, d]) => ({ uid: id, bid: d.bid, name: d.displayName }));
      entries.sort((a, b) => b.bid - a.bid);
      const highestBid = entries[0]?.bid ?? 0;
      const winner = entries.find((e) => e.bid === highestBid);

      const chipUpdates: Record<string, number> = {};
      for (const e of entries) {
        const curChips = chipsMap[e.uid] ?? 0;
        chipUpdates[e.uid] = Math.max(0, curChips - e.bid);
      }

      let resultMessage = '';
      if (winner && highestBid > 0) {
        let points = chest.points;
        if (chest.special === 'mirror') {
          points = winner.bid;
          resultMessage = `🪞 ${winner.name}: 거울 상자! 입찰한 ${winner.bid}칩만큼 +${points}점!`;
        } else if (chest.special === 'double') {
          const scoreSnap = await get(ref(realtimeDb, `games/${roomId}/current/scores/${winner.uid}`));
          const curScore = scoreSnap.exists() ? (scoreSnap.val() as number) : 0;
          points = curScore;
          resultMessage = `✨ ${winner.name}: 더블 찬스! 점수 2배! +${points}점!`;
        } else if (chest.special === 'steal') {
          const second = entries[1];
          if (second) {
            const secondSnap = await get(ref(realtimeDb, `games/${roomId}/current/scores/${second.uid}`));
            const secondScore = secondSnap.exists() ? (secondSnap.val() as number) : 0;
            const stolen = Math.floor(secondScore / 2);
            points = stolen;
            resultMessage = `🦊 ${winner.name}: ${second.name}에게서 ${stolen}점 도둑!`;
            await set(ref(realtimeDb, `games/${roomId}/current/scores/${second.uid}`), Math.max(0, secondScore - stolen));
          } else {
            points = 10;
            resultMessage = `🦊 ${winner.name}: 도둑 상자! +10점!`;
          }
        } else if (points < 0) {
          resultMessage = `${chest.label} ${winner.name}: ${points}점! 함정이었다!`;
        } else {
          resultMessage = `${chest.label} ${winner.name}: +${points}점 획득!`;
        }
        const scoreRef = ref(realtimeDb, `games/${roomId}/current/scores/${winner.uid}`);
        const curScoreSnap = await get(scoreRef);
        const curScore = curScoreSnap.exists() ? (curScoreSnap.val() as number) : 0;
        await set(scoreRef, curScore + points);
      } else {
        resultMessage = '📦 아무도 입찰하지 않았습니다!';
      }

      const newChips = { ...chipsMap, ...chipUpdates };
      await set(ref(realtimeDb, `games/${roomId}/chips`), newChips);

      const aliveUpdates: Record<string, boolean> = {};
      for (const [id, chips] of Object.entries(chipUpdates)) {
        if (chips <= 0) aliveUpdates[id] = false;
      }
      if (Object.keys(aliveUpdates).length > 0) {
        const curAlive = { ...(current.alive || {}), ...aliveUpdates };
        await set(ref(realtimeDb, `games/${roomId}/current/alive`), curAlive);
      }

      await set(ref(realtimeDb, `games/${roomId}/auctionResult/round${current.round}`), {
        winnerId: winner?.uid || null,
        winnerName: winner?.name || null,
        chest,
        message: resultMessage,
        allBids: entries,
      });

      await new Promise((r) => setTimeout(r, 3000));
      void advanceRound();
    };
    void processAuction();
  }, [current?.phase, current?.gameType, current?.round, current?.alive, allBids, isLeader, roundData, auctionPhase, chipsMap, roomId, advanceRound, current]);

  const handleTimeUp = useCallback(async () => {
    if (!current || !roundData) return;
    const gt = current.gameType;

    if (gt === 'destinyAuction' && !bidSubmitted) {
      await submitBid(0);
    } else if (gt === 'quickTouch' && !myChoice) {
      await submitScore(touchScore);
    } else if (gt === 'typingBattle' && !typingDone) {
      await submitScore(0);
    } else if (gt === 'oxSurvival' && !myChoice) {
      await submitChoice('timeout');
    } else if (gt === 'priceGuess' && !myChoice) {
      await submitChoice('0');
    } else if (gt === 'lineRunner' && !myChoice) {
      await submitScore(lineDistance);
    } else if (gt === 'bigRoulette' && roulettePhase === 'betting' && !scoreSubmittedRef.current) {
      void spinRoulette();
    } else if (gt === 'nunchiGame' && !myChoice) {
      await submitChoice('timeout');
    } else if (gt === 'weaponForge' && !scoreSubmittedRef.current) {
      const multiplier = (roundData.multiplier as number) || 1;
      const bonus = forgeLevel === 10 ? ((roundData.perfectBonus as number) || 20) : 0;
      const points = forgeLevel * multiplier + bonus;
      await submitScore(points);
    } else if (gt === 'drawGuess' && !myChoice) {
      await submitScore(0);
    }

    if (gt !== 'destinyAuction') {
      void advanceRound();
    }
  }, [
    current, roundData, bidSubmitted, touchScore, typingDone, myChoice,
    lineDistance, uid, advanceRound, submitBid, forgeLevel, roulettePhase, spinRoulette,
  ]);

  if (!current) return null;

  if (current.phase === 'game_intro') {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in">
        <div className="text-6xl animate-bounce">🎮</div>
        <h2 className="text-2xl font-bold text-white">{current.gameName}</h2>
        <p className="text-gray-400">{current.totalPlayers}명 참가 · {current.totalRounds}라운드</p>
        <span className="text-yellow-400 text-sm animate-pulse">잠시 후 시작...</span>
      </div>
    );
  }

  if (current.phase === 'final_result') {
    return (
      <div className="flex flex-col items-center p-4 space-y-4 overflow-y-auto">
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="text-xl font-bold text-yellow-400">{current.gameName} 최종 결과</h2>
        <div className="w-full max-w-sm space-y-2">
          {rankings.map((r, i) => (
            <div key={r.uid} className={`flex items-center justify-between px-4 py-2 rounded-xl ${
              i === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' :
              i === 1 ? 'bg-gray-500/20 border border-gray-500/30' :
              i === 2 ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-gray-800/50'
            } ${r.uid === uid ? 'ring-2 ring-purple-500' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold w-8 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <span className={`text-sm font-medium ${r.uid === uid ? 'text-purple-300' : 'text-white'}`}>
                  {r.name} {r.uid === uid && '(나)'}
                </span>
              </div>
              <span className="text-sm font-bold text-yellow-400">{r.score}점</span>
            </div>
          ))}
        </div>
        {current.isAutoGame && current.reward && (
          <div className="w-full max-w-sm mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
            <p className="text-yellow-400 font-bold text-sm mb-2">🎁 자동 게임 보상</p>
            <div className="space-y-1 text-xs">
              <p className="text-white">🥇 1등: +{current.reward.amount}P</p>
              <p className="text-gray-300">🥈 2등: +{Math.floor(current.reward.amount / 2)}P</p>
              <p className="text-gray-300">🥉 3등: +{Math.floor(current.reward.amount / 4)}P</p>
            </div>
            {current.rewardDistributed && (
              <p className="text-green-400 text-xs mt-2 font-bold">✅ 포인트 지급 완료!</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (current.phase === 'round_waiting') {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in">
        <div className="text-5xl animate-bounce">🎲</div>
        <h2 className="text-xl font-bold text-white">Round {current.round}/{current.totalRounds}</h2>
        <p className="text-yellow-400 text-sm animate-pulse">준비 중...</p>
        <div className="w-full max-w-sm bg-gray-800/30 rounded-xl p-3">
          <p className="text-gray-500 text-xs mb-2 font-bold">📊 실시간 순위</p>
          <div className="space-y-1">
            {rankings.slice(0, 5).map((r, i) => (
              <div key={r.uid} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${r.uid === uid ? 'bg-purple-500/20' : ''}`}>
                <span className="text-gray-400">{i + 1}. <span className={r.uid === uid ? 'text-purple-300 font-bold' : 'text-white'}>{r.name}</span></span>
                <span className="text-yellow-400 font-bold">{r.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (current.phase === 'round_result') {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in">
        <div className="text-4xl">📊</div>
        <h2 className="text-lg font-bold text-white">Round {current.round} 결과</h2>
        {showResult && (
          <div className={`text-2xl font-bold ${
            roundResult.startsWith('+') ? 'text-green-400' : roundResult.startsWith('-') ? 'text-red-400' : 'text-gray-400'
          }`}>{roundResult}</div>
        )}
        <div className="w-full max-w-sm bg-gray-800/30 rounded-xl p-3">
          <p className="text-gray-500 text-xs mb-2 font-bold">📊 실시간 순위</p>
          <div className="space-y-1">
            {rankings.slice(0, 5).map((r, i) => (
              <div key={r.uid} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${r.uid === uid ? 'bg-purple-500/20' : ''}`}>
                <span className="text-gray-400">{i + 1}. <span className={r.uid === uid ? 'text-purple-300 font-bold' : 'text-white'}>{r.name}</span></span>
                <span className="text-yellow-400 font-bold">{r.score}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-gray-500 text-xs animate-pulse">다음 라운드 준비 중...</p>
      </div>
    );
  }

  if (!roundData) return <div className="text-gray-500 text-center p-8">라운드 로딩 중...</div>;

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-3">
      <div>
        <span className="text-purple-400 text-xs font-bold">{current.gameName}</span>
        <h3 className="text-white font-bold text-base">Round {current.round}/{current.totalRounds}</h3>
      </div>
      {timeLeft > 0 && myChoice === null && (
        <span className={`text-lg font-bold ${timeLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
          ⏱ {timeLeft}초
        </span>
      )}
    </div>
  );

  const renderScoreBar = () => (
    <div className="bg-gray-800/50 rounded-xl px-4 py-2 flex items-center justify-between mb-3">
      <span className="text-gray-400 text-sm">내 점수</span>
      <span className="text-yellow-400 font-bold text-lg">{current.scores?.[uid] || 0}점</span>
    </div>
  );

  const renderResult = () => showResult ? (
    <div className="flex flex-col items-center py-4 animate-fade-in">
      <div className={`text-2xl font-bold ${
        roundResult.startsWith('+') ? 'text-green-400' : roundResult.startsWith('-') ? 'text-red-400' : 'text-gray-400'
      }`}>{roundResult}</div>
      <p className="text-gray-500 text-sm mt-1">다음 라운드 준비 중...</p>
    </div>
  ) : null;

  const renderMiniRanking = () => (
    <div className="bg-gray-800/30 rounded-xl p-3 mt-3">
      <p className="text-gray-500 text-xs mb-2 font-bold">📊 실시간 순위</p>
      <div className="space-y-1">
        {rankings.slice(0, 5).map((r, i) => (
          <div key={r.uid} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${r.uid === uid ? 'bg-purple-500/20' : ''}`}>
            <span className="text-gray-400">{i + 1}. <span className={r.uid === uid ? 'text-purple-300 font-bold' : 'text-white'}>{r.name}</span></span>
            <span className="text-yellow-400 font-bold">{r.score}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const gt = current.gameType;

  if (gt === 'drawGuess') {
    const isDrawer = (roundData.drawerId as string) === uid;
    const word = roundData.word as string;

    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}

        {isDrawer ? (
          <div className="space-y-2">
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 text-center">
              <p className="text-green-400 text-sm font-bold">당신이 출제자!</p>
              <p className="text-white text-xl font-bold mt-1">제시어: {word}</p>
            </div>
            <DrawingCanvas
              strokes={strokes}
              onStroke={async (stroke) => {
                soundManager.play('draw-stroke');
                const strokeRef = ref(realtimeDb, `games/${roomId}/drawing/round${current.round}/strokes`);
                await push(strokeRef, stroke);
              }}
              onClear={async () => {
                await set(ref(realtimeDb, `games/${roomId}/drawing/round${current.round}/strokes`), null);
              }}
              showToolbar={true}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-2 text-center">
              <p className="text-blue-400 text-sm font-bold">그림을 보고 맞추세요!</p>
              <p className="text-gray-500 text-xs">카테고리: {roundData.category as string}</p>
            </div>
            <DrawingCanvas strokes={strokes} disabled={true} showToolbar={false} />
            {myChoice === null && (
              <div className="flex gap-2">
                <input
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  placeholder="정답 입력..."
                  className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-purple-500 outline-none"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && guessInput.trim()) {
                      if (guessInput.trim() === word) {
                        soundManager.play('draw-correct');
                        await submitScore(30);
                        void advanceRound();
                      } else {
                        setGuessInput('');
                      }
                    }
                  }}
                />
                <button
                  onClick={async () => {
                    if (guessInput.trim() === word) {
                      soundManager.play('draw-correct');
                      await submitScore(30);
                      void advanceRound();
                    } else {
                      setGuessInput('');
                    }
                  }}
                  className="px-5 py-3 bg-purple-600 text-white rounded-xl font-bold"
                >확인</button>
              </div>
            )}
          </div>
        )}
        {renderResult()}
        {renderMiniRanking()}
      </div>
    );
  }

  if (gt === 'lineRunner') {
    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}
        {myChoice === null ? (
          <LineRunnerGame
            obstacles={(roundData.obstacles || []) as Array<{ x: number; y: number; w: number; h: number }>}
            speedMultiplier={(roundData.speedMultiplier as number) || 1}
            timeLimit={(roundData.timeLimit as number) || 30}
            onResult={async (dist) => {
              setLineDistance(dist);
              soundManager.play('line-crash');
              await submitScore(Math.floor(dist / 10));
              void advanceRound();
            }}
          />
        ) : (
          renderResult()
        )}
        {renderMiniRanking()}
      </div>
    );
  }

  if (gt === 'bigRoulette') {
    const baseCoins = (roundData?.baseCoins as number) ?? 100;
    const myTotalBet = Object.values(rouletteBets).reduce((s, v) => s + v, 0);
    const myAvailable = rouletteCoins - myTotalBet;
    const betOptions = [10, 20, 50, 100];
    const multSlotCount: Record<number, number> = {};
    ROULETTE_SEGMENTS.forEach((seg) => {
      if (seg.mult > 0) multSlotCount[seg.mult] = (multSlotCount[seg.mult] || 0) + 1;
    });

    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}
        <div className="text-center mb-2">
          <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-bold text-sm">
            ROUND {current.round} / {current.totalRounds || 10}
          </span>
        </div>

        {roulettePhase === 'betting' && (
          <>
            <div className="text-center text-gray-300 text-sm mb-2">
              보유: {rouletteCoins} | 베팅: {myTotalBet} | 남은: {myAvailable} · 기본 +{baseCoins}
            </div>
            <div className="flex flex-wrap gap-3 justify-center items-start">
              <canvas
                ref={rouletteCanvasRef}
                width={320}
                height={320}
                className="rounded-xl bg-gray-800"
              />
              <div className="bg-gray-800/50 rounded-xl p-3 min-w-[220px] max-w-[280px]">
                <p className="text-yellow-400 font-bold text-sm mb-2">배율 선택 후 베팅</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[1, 2, 3, 5, 10, 20].map((mult) => {
                    const seg = ROULETTE_SEGMENTS.find((s) => s.mult === mult);
                    const color = seg?.color ?? '#4b5563';
                    const slots = multSlotCount[mult] ?? 0;
                    const chance = ROULETTE_SEGMENTS.length ? Math.round((slots / ROULETTE_SEGMENTS.length) * 100) : 0;
                    return (
                      <button
                        key={mult}
                        onClick={() => setRouletteSelectedMult(mult)}
                        className={`py-2 rounded-lg text-white text-center text-sm font-bold border-2 transition ${
                          rouletteSelectedMult === mult ? 'border-white opacity-100' : 'border-white/20'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        ×{mult}
                        <span className="block text-[10px] opacity-80">{chance}%</span>
                        {rouletteBets[mult] ? <span className="block text-xs">🪙{rouletteBets[mult]}</span> : null}
                      </button>
                    );
                  })}
                </div>
                {rouletteSelectedMult !== null && (
                  <div className="bg-gray-800/80 rounded-lg p-2 mb-2 text-center">
                    <p className="text-gray-400 text-xs mb-1">×{rouletteSelectedMult}에 베팅</p>
                    <div className="flex gap-1 flex-wrap justify-center">
                      {betOptions.map((v) => (
                        <button
                          key={v}
                          disabled={myAvailable < v}
                          onClick={() => placeRouletteBet(rouletteSelectedMult!, v)}
                          className="px-2 py-1 rounded-lg bg-gray-600 text-white text-xs disabled:opacity-40"
                        >
                          🪙{v}
                        </button>
                      ))}
                      <button
                        disabled={myAvailable <= 0}
                        onClick={() => placeRouletteBet(rouletteSelectedMult!, myAvailable)}
                        className="px-2 py-1 rounded-lg bg-red-600 text-white text-xs"
                      >
                        ALL
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRouletteSelectedMult(null)}
                      className="mt-1 text-xs text-gray-500"
                    >
                      취소
                    </button>
                  </div>
                )}
                <button
                  onClick={() => void spinRoulette()}
                  className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                >
                  🎰 룰렛 돌리기!
                </button>
              </div>
            </div>
          </>
        )}

        {roulettePhase === 'spinning' && (
          <div className="text-center">
            <canvas ref={rouletteCanvasRef} width={320} height={320} className="rounded-xl bg-gray-800 mx-auto" />
            <p className="text-yellow-400 font-bold mt-2">어디에 멈출까...? 🎯</p>
          </div>
        )}

        {roulettePhase === 'result' && (
          <div className="text-center">
            <div className="text-4xl mb-2">{ROULETTE_SEGMENTS[rouletteWinIdx]?.mult === 0 ? '💀' : '🎯'}</div>
            <p className="text-2xl font-bold text-white">{ROULETTE_SEGMENTS[rouletteWinIdx]?.label}</p>
            <p className="text-gray-300 text-sm mt-2">{rouletteResultMsg}</p>
            <p className="text-yellow-400 font-bold mt-2">보유: 🪙{rouletteCoins}</p>
            {Object.keys(rouletteOtherCoins).length > 0 && (
              <p className="text-gray-500 text-xs mt-1">
                다른 플레이어: {Object.entries(rouletteOtherCoins).map(([id, c]) => `${current.nameMap[id] ?? id.slice(0, 6)} 🪙${c}`).join(', ')}
              </p>
            )}
          </div>
        )}

        {renderResult()}
        {renderMiniRanking()}
      </div>
    );
  }

  if (gt === 'typingBattle') {
    const sentence = (roundData.sentence as string) || '';

    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-3">
          <p className="text-gray-400 text-xs mb-2">이 문장을 정확하게 타이핑하세요:</p>
          <p className="text-white text-lg font-bold leading-relaxed">{sentence}</p>
        </div>
        {!typingDone && myChoice === null ? (
          <div className="space-y-2">
            <input
              value={typingInput}
              onChange={(e) => {
                setTypingInput(e.target.value);
                soundManager.play('typing-key');
              }}
              placeholder="여기에 타이핑..."
              autoFocus
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-yellow-500 outline-none text-lg"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && typingInput.trim()) {
                  soundManager.play('typing-complete');
                  const elapsed = (Date.now() - typingStartTime) / 1000;
                  const accuracy = calculateAccuracy(sentence, typingInput.trim());
                  const wpm = Math.floor((typingInput.trim().length / elapsed) * 60 / 5);
                  const points = Math.floor(accuracy * wpm / 10);
                  setTypingDone(true);
                  await submitScore(points);
                  void advanceRound();
                }
              }}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>정확도: {calculateAccuracy(sentence, typingInput)}%</span>
              <span>{typingInput.length}/{sentence.length}자</span>
            </div>
          </div>
        ) : (
          renderResult()
        )}
        {renderMiniRanking()}
      </div>
    );
  }

  if (gt === 'weaponForge') {
    const weapon = roundData?.weapon as { id: string; name: string; emoji: string; rarity: string } | undefined;
    const multiplier = (roundData?.multiplier as number) || 1;
    const maxLevel = 10;
    const levelColors = ['text-gray-400', 'text-gray-300', 'text-gray-200', 'text-green-400', 'text-green-300', 'text-blue-400', 'text-blue-300', 'text-purple-400', 'text-purple-300', 'text-yellow-400', 'text-red-400'];
    const rarityColors: Record<string, string> = {
      common: 'border-gray-500/30',
      rare: 'border-blue-500/30',
      epic: 'border-purple-500/30',
      legendary: 'border-yellow-500/40',
    };
    const rarityLabels: Record<string, string> = {
      common: '일반',
      rare: '레어',
      epic: '에픽',
      legendary: '전설',
    };
    const table = (roundData?.enhanceTable as Array<{ success: number; fail: number; down: number; destroy: number }>)?.[forgeLevel] ?? null;

    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}

        {weapon && (
          <div className={`bg-gray-800/60 border-2 ${rarityColors[weapon.rarity] || 'border-gray-500/30'} rounded-2xl p-4 text-center mb-3`}>
            <p className="text-gray-500 text-[10px] mb-1">{rarityLabels[weapon.rarity] || '일반'} 무기 · 배율 ×{multiplier}</p>
            <div className={`text-6xl mb-2 ${forgeAnimating ? 'animate-bounce' : ''} ${forgePerfect ? 'animate-pulse' : ''}`}>{weapon.emoji}</div>
            <p className="text-white font-bold text-lg">{weapon.name}</p>
            <div className="mt-2">
              <span className={`text-3xl font-black ${levelColors[forgeLevel] || 'text-gray-400'}`}>+{forgeLevel}</span>
              {forgePerfect && <span className="text-yellow-400 text-sm ml-2 animate-pulse">🌟 MAX!</span>}
            </div>
            <div className="mt-2 flex justify-center gap-1">
              {Array.from({ length: maxLevel }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-6 rounded-full transition-all duration-300 ${i < forgeLevel ? (i >= 7 ? 'bg-red-500 shadow-red-500/50 shadow-sm' : i >= 5 ? 'bg-purple-500' : 'bg-green-500') : 'bg-gray-700'}`}
                />
              ))}
            </div>
          </div>
        )}

        {forgeLevel < maxLevel && !scoreSubmittedRef.current && table && (
          <div className="space-y-2 mb-3">
            <div className="bg-gray-800/40 rounded-xl p-3">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-green-400">성공 {table.success}%</span>
                <span className="text-gray-400">실패 {table.fail}%</span>
                {table.down > 0 && <span className="text-orange-400">하락 {table.down}%</span>}
                {table.destroy > 0 && <span className="text-red-400">파괴 {table.destroy}%</span>}
              </div>
              <div className="flex h-2 rounded-full overflow-hidden">
                <div className="bg-green-500" style={{ width: `${table.success}%` }} />
                <div className="bg-gray-500" style={{ width: `${table.fail}%` }} />
                {table.down > 0 && <div className="bg-orange-500" style={{ width: `${table.down}%` }} />}
                {table.destroy > 0 && <div className="bg-red-500" style={{ width: `${table.destroy}%` }} />}
              </div>
            </div>
            <button
              onClick={() => void attemptForge()}
              disabled={forgeAnimating}
              className={`w-full py-4 rounded-xl font-bold text-lg transition shadow-lg ${
                forgeLevel >= 7
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white'
                  : forgeLevel >= 5
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
              } disabled:opacity-50`}
            >
              {forgeAnimating ? '🔨 강화 중...' : forgeLevel >= 8 ? `🔥 +${forgeLevel}→+${forgeLevel + 1} 강화! (위험!)` : forgeLevel >= 5 ? `⚡ +${forgeLevel}→+${forgeLevel + 1} 강화!` : `🔨 +${forgeLevel}→+${forgeLevel + 1} 강화하기`}
            </button>
            {forgeStreak >= 3 && <p className="text-center text-yellow-400 text-xs animate-pulse">🔥 {forgeStreak}연속 성공! 지금이 기회!</p>}
          </div>
        )}

        {forgePerfect && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-4 text-center mb-3 animate-pulse">
            <p className="text-yellow-400 font-bold text-lg">🌟 +10 완성! 보너스 +{(roundData?.perfectBonus as number) || 20}점!</p>
            <p className="text-gray-400 text-xs">이번 라운드 점수: {forgeLevel * multiplier + ((roundData?.perfectBonus as number) || 20)}점</p>
          </div>
        )}

        {forgeLog.length > 0 && (
          <div className="bg-gray-800/30 rounded-xl p-2 mb-3 max-h-24 overflow-y-auto">
            {forgeLog.slice(-5).reverse().map((log, i) => (
              <div key={i} className={`text-xs px-2 py-0.5 ${log.result === 'success' ? 'text-green-400' : log.result === 'down' ? 'text-orange-400' : log.result === 'destroy' ? 'text-red-400' : 'text-gray-500'}`}>
                {log.action} → {log.result === 'success' ? `✅ 성공! +${log.toLevel}` : log.result === 'fail' ? '❌ 실패 (유지)' : log.result === 'down' ? `⬇️ 하락! +${log.toLevel}` : '💥 파괴! +0'}
              </div>
            ))}
          </div>
        )}

        <div className="bg-gray-800/30 rounded-xl p-3">
          <p className="text-gray-500 text-xs mb-2 font-bold">⚔️ 실시간 강화 현황</p>
          <div className="space-y-1">
            {Object.entries(current.nameMap || {})
              .map(([id, name]) => ({ uid: id, name, level: otherForge[id]?.level ?? 0, score: current.scores?.[id] || 0 }))
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div key={p.uid} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${p.uid === uid ? 'bg-purple-500/20' : ''}`}>
                  <span className="text-gray-400">{i + 1}. <span className={p.uid === uid ? 'text-purple-300 font-bold' : 'text-white'}>{p.name}</span></span>
                  <div className="flex gap-3 items-center">
                    <span className={`font-bold ${p.level >= 8 ? 'text-red-400' : p.level >= 5 ? 'text-purple-400' : 'text-green-400'}`}>+{p.level}</span>
                    <span className="text-yellow-400 font-bold">{p.score}점</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {renderMiniRanking()}
      </div>
    );
  }

  if (gt === 'priceGuess') {
    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}
        <div className="bg-gray-800/30 rounded-xl p-4 text-center mb-3">
          <p className="text-4xl mb-2">{roundData.hint as string}</p>
          <p className="text-white text-xl font-bold">{roundData.itemName as string}</p>
          <p className="text-gray-500 text-xs mt-1">{roundData.category as string}</p>
        </div>
        {myChoice === null ? (
          <div className="flex gap-2">
            <input
              type="number"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="가격 입력 (원)"
              className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 outline-none text-center text-lg"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && priceInput) {
                  soundManager.play('cash-register');
                  const guess = parseInt(priceInput, 10);
                  const actual = roundData.actualPrice as number;
                  const diff = Math.abs(guess - actual);
                  const accuracy = Math.max(0, 100 - Math.floor((diff / actual) * 100));
                  const points = Math.floor(accuracy / 2);
                  if (accuracy >= 50) soundManager.play('price-close');
                  else soundManager.play('price-far');
                  await submitChoice(priceInput);
                  await submitScore(points);
                  setRoundResult(`정답: ${actual.toLocaleString()}원 | 정확도 ${accuracy}% -> +${points}점`);
                  setShowResult(true);
                  void advanceRound();
                }
              }}
            />
            <button
              onClick={async () => {
                if (!priceInput) return;
                soundManager.play('cash-register');
                const guess = parseInt(priceInput, 10);
                const actual = roundData.actualPrice as number;
                const diff = Math.abs(guess - actual);
                const accuracy = Math.max(0, 100 - Math.floor((diff / actual) * 100));
                const points = Math.floor(accuracy / 2);
                if (accuracy >= 50) soundManager.play('price-close');
                else soundManager.play('price-far');
                await submitChoice(priceInput);
                await submitScore(points);
                setRoundResult(`정답: ${actual.toLocaleString()}원 | 정확도 ${accuracy}% -> +${points}점`);
                setShowResult(true);
                void advanceRound();
              }}
              className="px-5 py-3 bg-yellow-600 text-white rounded-xl font-bold"
            >확인</button>
          </div>
        ) : (
          renderResult()
        )}
        {renderMiniRanking()}
      </div>
    );
  }

  if (gt === 'oxSurvival') {
    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}
        <div className="bg-gray-800/30 rounded-xl p-4 text-center mb-3">
          <p className="text-white text-lg font-bold">{roundData.question as string}</p>
        </div>
        {myChoice === null ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                soundManager.play('ox-select');
                const correct = (roundData.answer as boolean) === true;
                soundManager.play(correct ? 'ox-survive' : 'ox-eliminate');
                await submitChoice('O');
                await submitScore(correct ? 20 : -10);
                setOxRevealed(true);
                setRoundResult(correct ? '⭕ 정답! +20점' : '❌ 오답! -10점');
                setShowResult(true);
                void advanceRound();
              }}
              className="py-8 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 rounded-2xl text-5xl font-bold text-blue-400 transition active:scale-95"
            >⭕</button>
            <button
              onClick={async () => {
                soundManager.play('ox-select');
                const correct = (roundData.answer as boolean) === false;
                soundManager.play(correct ? 'ox-survive' : 'ox-eliminate');
                await submitChoice('X');
                await submitScore(correct ? 20 : -10);
                setOxRevealed(true);
                setRoundResult(correct ? '⭕ 정답! +20점' : '❌ 오답! -10점');
                setShowResult(true);
                void advanceRound();
              }}
              className="py-8 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 rounded-2xl text-5xl font-bold text-red-400 transition active:scale-95"
            >❌</button>
          </div>
        ) : (
          <div className="text-center space-y-2">
            {renderResult()}
            {oxRevealed && (
              <p className="text-gray-400 text-sm">{roundData.explanation as string}</p>
            )}
          </div>
        )}
        {renderMiniRanking()}
      </div>
    );
  }

  if (gt === 'destinyAuction') {
    const chest = roundData?.chest as { type: string; label: string; points: number; special?: string } | undefined;
    const hint = (roundData?.chestHint as string) || '📦 상자';
    const myChips = chipsMap[uid] ?? 0;
    const isAlive = current.alive?.[uid];

    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}

        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-gray-800/50 rounded-xl px-3 py-2 text-center">
            <span className="text-gray-400 text-xs">내 점수</span>
            <p className="text-yellow-400 font-bold text-lg">{current.scores?.[uid] || 0}점</p>
          </div>
          <div className="flex-1 bg-gray-800/50 rounded-xl px-3 py-2 text-center">
            <span className="text-gray-400 text-xs">남은 칩</span>
            <p className={`font-bold text-lg ${myChips <= 2 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              🪙 {myChips}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-yellow-900/30 to-gray-900/60 border border-yellow-500/30 rounded-2xl p-5 text-center mb-3">
          {!chestRevealed ? (
            <>
              <div className="text-6xl mb-3 animate-bounce">🎁</div>
              <p className="text-yellow-400 font-bold text-lg">{hint}</p>
              <p className="text-gray-500 text-xs mt-1">이 상자에 얼마를 걸겠습니까?</p>
            </>
          ) : chest ? (
            <>
              <div className="text-5xl mb-2">
                {chest.type === 'gold' ? '💎' : chest.type === 'trap' ? '💀' : chest.type === 'bomb' ? '💣' : chest.type === 'mirror' ? '🪞' : chest.type === 'double' ? '✨' : chest.type === 'steal' ? '🦊' : '📦'}
              </div>
              <p className={`font-bold text-xl ${chest.points > 0 ? 'text-yellow-400' : chest.points < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {chest.label}
              </p>
              <p className={`text-2xl font-black mt-1 ${chest.points > 0 ? 'text-green-400' : chest.points < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {chest.special ? '⚡ 특수 효과!' : `${chest.points > 0 ? '+' : ''}${chest.points}점`}
              </p>
            </>
          ) : null}
        </div>

        {isAlive && auctionPhase === 'bidding' && !bidSubmitted && (
          <div className="space-y-3 mb-3">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setMyBid((m) => Math.max(0, m - 1))}
                className="w-12 h-12 rounded-full bg-gray-700 text-white text-2xl font-bold hover:bg-gray-600 transition"
              >−</button>
              <div className="text-center">
                <p className="text-4xl font-black text-yellow-400">🪙 {myBid}</p>
                <p className="text-gray-500 text-xs">입찰 칩</p>
              </div>
              <button
                onClick={() => setMyBid((m) => Math.min(myChips, m + 1))}
                className="w-12 h-12 rounded-full bg-gray-700 text-white text-2xl font-bold hover:bg-gray-600 transition"
              >+</button>
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              {[0, 1, 2, 3, Math.floor(myChips / 2), myChips].filter((v, i, a) => v <= myChips && a.indexOf(v) === i).map((v) => (
                <button
                  key={v}
                  onClick={() => setMyBid(v)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${myBid === v ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >{v === 0 ? '패스' : v === myChips ? 'ALL IN' : v}</button>
              ))}
            </div>
            <button
              onClick={() => void submitBid(myBid)}
              className="w-full py-3 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 transition shadow-lg"
            >
              {myBid === 0 ? '🫣 패스하기' : myBid === myChips ? `🔥 올인! (${myBid}칩)` : `🎰 ${myBid}칩 입찰하기`}
            </button>
          </div>
        )}

        {bidSubmitted && auctionPhase === 'bidding' && (
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 text-center mb-3">
            <p className="text-purple-300 font-bold">🎰 {myBid}칩 입찰 완료!</p>
            <p className="text-gray-500 text-sm animate-pulse">다른 참가자 대기 중...</p>
            <p className="text-gray-600 text-xs mt-1">
              입찰: {Object.keys(allBids).length} / {Object.keys(current.alive || {}).filter((id) => current.alive![id]).length}명
            </p>
          </div>
        )}

        {auctionResult && (
          <div className="bg-gray-800/60 border border-yellow-500/30 rounded-xl p-4 text-center mb-3">
            <p className="text-white font-bold text-base mb-2">{auctionResult.message}</p>
            <div className="space-y-1">
              {auctionResult.allBids.map((b, i) => (
                <div key={b.uid} className={`flex justify-between text-xs px-2 py-1 rounded ${b.uid === uid ? 'bg-purple-500/20' : ''} ${b.uid === auctionResult.winnerId ? 'border border-yellow-500/50' : ''}`}>
                  <span className={b.uid === uid ? 'text-purple-300' : 'text-gray-400'}>
                    {i === 0 ? '👑 ' : ''}{b.name}{b.uid === uid ? ' (나)' : ''}
                  </span>
                  <span className="text-yellow-400 font-bold">🪙 {b.bid}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isAlive && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-4 text-center mb-3">
            <p className="text-red-400 font-bold">💀 칩 소진! 탈락했습니다</p>
            <p className="text-gray-500 text-xs">결과를 지켜보세요</p>
          </div>
        )}

        <div className="bg-gray-800/30 rounded-xl p-3">
          <p className="text-gray-500 text-xs mb-2 font-bold">🪙 참가자 칩 현황</p>
          <div className="space-y-1">
            {Object.entries(current.nameMap || {})
              .map(([id, name]) => ({ uid: id, name, chips: chipsMap[id] ?? 0, score: current.scores?.[id] || 0, alive: current.alive?.[id] }))
              .sort((a, b) => b.score - a.score)
              .map((p, i) => (
                <div key={p.uid} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${p.uid === uid ? 'bg-purple-500/20' : ''} ${!p.alive ? 'opacity-40' : ''}`}>
                  <span className="text-gray-400">
                    {i + 1}. <span className={p.uid === uid ? 'text-purple-300 font-bold' : 'text-white'}>{p.name}</span>
                    {!p.alive && ' 💀'}
                  </span>
                  <div className="flex gap-3">
                    <span className="text-green-400">🪙{p.chips}</span>
                    <span className="text-yellow-400 font-bold">{p.score}점</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (gt === 'nunchiGame') {
    const maxNum = (roundData.maxNumber as number) || 10;
    const claimedNumbers = Object.values(nunchiClaimed).filter((n) => n <= maxNum);
    const nextNumber = claimedNumbers.length > 0 ? Math.max(...claimedNumbers) + 1 : 1;
    const duplicates = claimedNumbers.filter((n, i, arr) => arr.indexOf(n) !== i);
    const iEliminated = myNunchiNumber !== null && duplicates.includes(myNunchiNumber);

    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}
        <div className="bg-gray-800/30 rounded-xl p-4 text-center mb-3">
          <p className="text-gray-400 text-sm">다음 숫자를 클릭하세요</p>
          <p className="text-6xl font-bold text-white my-3">{nextNumber}</p>
          <p className="text-yellow-400 text-xs">동시에 누르면 둘 다 탈락!</p>
        </div>
        {myNunchiNumber === null && myChoice === null ? (
          <button
            onClick={async () => {
              const myNum = nextNumber;
              soundManager.play('nunchi-claim');
              setMyNunchiNumber(myNum);
              await set(ref(realtimeDb, `games/${roomId}/nunchi/round${current.round}/${uid}`), myNum);
              setTimeout(async () => {
                const snap = await get(ref(realtimeDb, `games/${roomId}/nunchi/round${current.round}`));
                const all = snap.exists() ? (snap.val() as Record<string, number>) : {};
                const vals = Object.values(all);
                const isDup = vals.filter((v) => v === myNum).length > 1;
                if (isDup) {
                  soundManager.play('nunchi-clash');
                  await submitScore(-20);
                  setRoundResult('💥 동시 클릭! -20점');
                } else {
                  soundManager.play('nunchi-safe');
                  await submitScore(myNum * 5);
                  setRoundResult(`${myNum}번 성공! +${myNum * 5}점`);
                }
                setShowResult(true);
                void advanceRound();
              }, 2000);
            }}
            className="w-full py-10 bg-green-600/30 hover:bg-green-600/50 border-2 border-green-500/50 rounded-2xl text-2xl font-bold text-green-400 transition active:scale-90"
          >
            👀 {nextNumber} 클릭!
          </button>
        ) : (
          <div className="text-center">
            <p className="text-white text-lg">{myNunchiNumber}번 선택함</p>
            {iEliminated && <p className="text-red-400 font-bold mt-2">💥 동시 클릭 — 탈락!</p>}
            {renderResult()}
          </div>
        )}
        {renderMiniRanking()}
      </div>
    );
  }

  if (gt === 'quickTouch') {
    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}
        <div className="relative bg-gray-800/30 rounded-xl mb-3" style={{ height: 350 }}>
          <div className="text-center pt-2">
            <span className="text-yellow-400 font-bold text-2xl">{touchScore}</span>
            <span className="text-gray-500 text-sm ml-2">점</span>
          </div>
          {activeTarget && (
            <button
              onClick={() => {
                soundManager.play('target-hit');
                setTouchScore((prev) => prev + 10);
                setActiveTarget(null);
              }}
              className="absolute bg-red-500 rounded-full shadow-lg shadow-red-500/50 transition-transform active:scale-75"
              style={{
                left: `${activeTarget.x}%`,
                top: `${activeTarget.y}%`,
                width: 44,
                height: 44,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <span className="text-white text-lg">🎯</span>
            </button>
          )}
        </div>
        {timeLeft <= 0 && myChoice === null && (
          <button
            onClick={async () => {
              await submitScore(touchScore);
              void advanceRound();
            }}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold"
          >결과 제출 ({touchScore}점)</button>
        )}
        {renderResult()}
        {renderMiniRanking()}
      </div>
    );
  }

  return (
    <div className="p-4 text-center text-gray-500">
      <p>게임 로딩 중...</p>
    </div>
  );
}

function calculateAccuracy(original: string, typed: string): number {
  if (!typed) return 0;
  let correct = 0;
  const len = Math.min(original.length, typed.length);
  for (let i = 0; i < len; i++) {
    if (original[i] === typed[i]) correct++;
  }
  return Math.floor((correct / original.length) * 100);
}
