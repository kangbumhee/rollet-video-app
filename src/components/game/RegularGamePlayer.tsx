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
  const [tapCount, setTapCount] = useState(0);
  const [tapping, setTapping] = useState(false);
  const [otherTaps, setOtherTaps] = useState<Record<string, { count: number; lastTapAt: number; displayName: string }>>({});
  const [simultaneousTaps, setSimultaneousTaps] = useState<string[]>([]);
  const [nunchiClaimed, setNunchiClaimed] = useState<Record<string, number>>({});
  const [myNunchiNumber, setMyNunchiNumber] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [bombAnswer, setBombAnswer] = useState('');
  const [currentBombHolder, setCurrentBombHolder] = useState('');
  const [bombQuizIdx, setBombQuizIdx] = useState(0);
  const [lineDistance, setLineDistance] = useState(0);
  const [oxRevealed, setOxRevealed] = useState(false);
  const [touchScore, setTouchScore] = useState(0);
  const [activeTarget, setActiveTarget] = useState<{ x: number; y: number; id: number } | null>(null);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [liarPhase, setLiarPhase] = useState<'discuss' | 'vote' | 'reveal'>('discuss');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scoreSubmittedRef = useRef(false);
  const lastTransitionedRoundRef = useRef<number>(0);
  const advanceRoundCalledRef = useRef(false);
  const finalSoundPlayedRef = useRef(false);
  const lineRunSoundRoundRef = useRef('');
  const liarRevealSoundRoundRef = useRef('');
  const bombTickSoundKeyRef = useRef('');

  useEffect(() => {
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/current`), (snap) => {
      if (snap.exists()) setCurrent(snap.val() as GameCurrent);
      else setCurrent(null);
    });
    return () => unsub();
  }, [roomId]);

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
        setTapCount(0);
        setTapping(false);
        setOtherTaps({});
        setSimultaneousTaps([]);
        setMyNunchiNumber(null);
        setNunchiClaimed({});
        setPriceInput('');
        setBombAnswer('');
        setBombQuizIdx(0);
        setLineDistance(0);
        setOxRevealed(false);
        setTouchScore(0);
        setActiveTarget(null);
        setLiarPhase('discuss');
        setVotes({});
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
    if (!current.startedBy || current.startedBy !== uid) return;

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
  }, [current?.phase, current?.startedBy, current?.introStartedAt, uid, roomId]);

  // round_waiting -> round_playing phase is handled on client
  useEffect(() => {
    if (!current || !uid) return;
    if (current.phase !== 'round_waiting') return;
    if (!current.startedBy || current.startedBy !== uid) return;
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
  }, [current?.phase, current?.round, current?.startedBy, uid, roomId]);

  // round_result -> next round_waiting/final_result transition is handled on client
  useEffect(() => {
    if (!current || !uid) return;
    if (current.phase !== 'round_result') return;
    if (!current.startedBy || current.startedBy !== uid) return;
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
  }, [current?.phase, current?.round, current?.totalRounds, current?.startedBy, uid, roomId]);

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

  useEffect(() => {
    if (!current || current.gameType !== 'lineRunner') return;
    const key = `${current.gameType}-${current.round}`;
    if (lineRunSoundRoundRef.current === key) return;
    lineRunSoundRoundRef.current = key;
    soundManager.play('line-run');
  }, [current?.gameType, current?.round, current]);

  useEffect(() => {
    if (!current || current.gameType !== 'liarVote') return;
    if (liarPhase !== 'reveal') return;
    const key = `${current.gameType}-${current.round}-${liarPhase}`;
    if (liarRevealSoundRoundRef.current === key) return;
    liarRevealSoundRoundRef.current = key;
    soundManager.play('liar-reveal');
  }, [current?.gameType, current?.round, liarPhase, current]);

  useEffect(() => {
    if (!current || current.gameType !== 'bombPass') return;
    if (currentBombHolder !== uid) return;
    const key = `${current.gameType}-${current.round}-${currentBombHolder}`;
    if (bombTickSoundKeyRef.current === key) return;
    bombTickSoundKeyRef.current = key;
    soundManager.play('bomb-tick');
  }, [current?.gameType, current?.round, currentBombHolder, uid, current]);

  useEffect(() => {
    if (tapCount > 0 && tapCount % 10 === 0) {
      soundManager.play('tap-frenzy');
    }
  }, [tapCount]);

  // 탭 서바이벌 - 다른 플레이어 탭 실시간 구독
  useEffect(() => {
    if (!current || current.gameType !== 'tapSurvival' || current.round < 1) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/taps/round${current.round}`), (snap) => {
      if (snap.exists()) {
        setOtherTaps(snap.val() as Record<string, { count: number; lastTapAt: number; displayName: string }>);
      } else {
        setOtherTaps({});
      }
    });
    return () => unsub();
  }, [roomId, current?.gameType, current?.round]);

  // 동시 탭 감지 (내 탭과 200ms 이내 다른 사람 탭)
  useEffect(() => {
    if (!current || current.gameType !== 'tapSurvival') return;
    if (tapCount === 0) return;

    const now = Date.now();
    const simultaneous: string[] = [];

    Object.entries(otherTaps).forEach(([id, data]) => {
      if (id === uid) return;
      if (Math.abs(now - data.lastTapAt) < 200) {
        simultaneous.push(data.displayName || current.nameMap[id] || id.slice(0, 6));
      }
    });

    if (simultaneous.length > 0) {
      setSimultaneousTaps(simultaneous);
      // 1.5초 후 자동으로 사라지게
      const timer = setTimeout(() => setSimultaneousTaps([]), 1500);
      return () => clearTimeout(timer);
    }
  }, [tapCount, otherTaps]);

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

  useEffect(() => {
    if (!current || current.gameType !== 'bombPass' || current.round < 1) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/bomb/round${current.round}/holder`), (snap) => {
      if (snap.exists()) setCurrentBombHolder(snap.val() as string);
      else if (roundData) setCurrentBombHolder((roundData.initialBombHolder as string) || '');
    });
    return () => unsub();
  }, [roomId, current?.gameType, current?.round, roundData, current]);

  useEffect(() => {
    if (!current || current.gameType !== 'quickTouch' || !roundData || current.round < 1) return;
    const targets = (roundData.targets || []) as Array<{ x: number; y: number; delay: number; size: number }>;
    const timers: NodeJS.Timeout[] = [];
    targets.forEach((t, i) => {
      const timer = setTimeout(() => {
        soundManager.play('target-appear');
        setActiveTarget({ x: t.x, y: t.y, id: i });
        setTimeout(() => setActiveTarget((prev) => {
          if (prev?.id === i) {
            soundManager.play('target-miss');
            return null;
          }
          return prev;
        }), 1000);
      }, t.delay);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [current?.gameType, current?.round, roundData, current]);

  useEffect(() => {
    if (!current || current.gameType !== 'liarVote' || current.round < 1) return;
    const unsub = onValue(ref(realtimeDb, `games/${roomId}/votes/round${current.round}`), (snap) => {
      if (snap.exists()) setVotes(snap.val() as Record<string, string>);
    });
    return () => unsub();
  }, [roomId, current?.gameType, current?.round, current]);

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

  const revealLiarResult = async () => {
    if (!current || !roundData) return;
    const liarId = roundData.liarId as string;
    const voteCounts: Record<string, number> = {};
    Object.values(votes).forEach((targetId) => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });
    const topVoted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];
    const caught = topVoted && topVoted[0] === liarId;

    if (caught) {
      soundManager.play('liar-caught');
      const aliveIds = Object.keys(current.alive).filter((id) => current.alive[id] && id !== liarId);
      for (const id of aliveIds) {
        const sRef = ref(realtimeDb, `games/${roomId}/current/scores/${id}`);
        const s = await get(sRef);
        await set(sRef, ((s.val() as number) || 0) + 20);
      }
      setRoundResult('라이어 적발 성공! +20점');
    } else {
      const sRef = ref(realtimeDb, `games/${roomId}/current/scores/${liarId}`);
      const s = await get(sRef);
      await set(sRef, ((s.val() as number) || 0) + 30);
      setRoundResult(uid === liarId ? '속이기 성공! +30점' : '라이어를 놓침!');
    }
    setShowResult(true);
  };

  const advanceRound = useCallback(async () => {
    if (!current) return;
    if (!current.startedBy || current.startedBy !== uid) return;
    if (advanceRoundCalledRef.current) return;
    advanceRoundCalledRef.current = true;
    soundManager.play('whoosh');
    await set(ref(realtimeDb, `games/${roomId}/current/phase`), 'round_result');
  }, [current, roomId, uid]);

  const handleTimeUp = useCallback(async () => {
    if (!current || !roundData) return;
    const gt = current.gameType;

    if (gt === 'tapSurvival' && !myChoice) {
      await submitScore(tapCount);
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
    } else if (gt === 'liarVote' && liarPhase === 'discuss') {
      setLiarPhase('vote');
      setTimeLeft((roundData.voteTime as number) || 15);
    } else if (gt === 'liarVote' && liarPhase === 'vote') {
      setLiarPhase('reveal');
      await revealLiarResult();
    } else if (gt === 'nunchiGame' && !myChoice) {
      await submitChoice('timeout');
    } else if (gt === 'bombPass') {
      if (currentBombHolder === uid) {
        soundManager.play('explosion');
        await submitScore(-50);
      }
    } else if (gt === 'drawGuess' && !myChoice) {
      await submitScore(0);
    }

    void advanceRound();
  }, [
    current, roundData, tapCount, touchScore, typingDone, myChoice, liarPhase,
    lineDistance, currentBombHolder, uid, advanceRound
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

  if (gt === 'liarVote') {
    const isLiar = (roundData.liarId as string) === uid;
    const myWord = isLiar ? (roundData.fakeWord as string) : (roundData.realWord as string);
    const alivePlayers = Object.entries(current.nameMap).filter(([id]) => current.alive[id]);

    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}

        <div className={`rounded-xl px-4 py-3 text-center mb-3 ${isLiar ? 'bg-red-500/20 border border-red-500/30' : 'bg-blue-500/20 border border-blue-500/30'}`}>
          <p className="text-xs text-gray-400">카테고리: {roundData.category as string}</p>
          <p className="text-white text-xl font-bold mt-1">{myWord}</p>
          {isLiar && <p className="text-red-400 text-xs mt-1">당신이 라이어입니다! 들키지 마세요</p>}
        </div>

        {liarPhase === 'discuss' && (
          <div className="bg-gray-800/30 rounded-xl p-4 text-center">
            <p className="text-yellow-400 font-bold">💬 토론 시간</p>
            <p className="text-gray-400 text-sm mt-1">채팅으로 서로의 제시어를 물어보세요!</p>
          </div>
        )}

        {liarPhase === 'vote' && (
          <div className="space-y-2">
            <p className="text-red-400 font-bold text-center">🗳️ 투표! 라이어를 지목하세요</p>
            <div className="grid grid-cols-2 gap-2">
              {alivePlayers.filter(([id]) => id !== uid).map(([id, name]) => (
                <button
                  key={id}
                  onClick={async () => {
                    soundManager.play('vote-cast');
                    await set(ref(realtimeDb, `games/${roomId}/votes/round${current.round}/${uid}`), id);
                    setMyChoice(id);
                  }}
                  disabled={myChoice !== null}
                  className="px-3 py-3 bg-gray-800 hover:bg-red-600/30 border border-gray-700 hover:border-red-500 rounded-xl text-white text-sm font-bold transition disabled:opacity-40"
                >
                  🕵️ {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {liarPhase === 'reveal' && (
          <div className="bg-gray-800/30 rounded-xl p-4 text-center space-y-2">
            <p className="text-2xl">🕵️</p>
            <p className="text-white font-bold">라이어: {roundData.liarName as string}</p>
            <p className="text-gray-400 text-sm">정답: {roundData.realWord as string}</p>
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

  if (gt === 'bombPass') {
    const quizzes = (roundData.quizzes || []) as Array<{ q: string; a: string; acceptable: string[] }>;
    const currentQuiz = quizzes[bombQuizIdx] || { q: '?', a: '?', acceptable: ['?'] };
    const isBombHolder = currentBombHolder === uid;

    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}
        <div className={`rounded-xl p-4 text-center mb-3 ${isBombHolder ? 'bg-red-500/20 border border-red-500/30 animate-pulse' : 'bg-gray-800/30'}`}>
          <p className="text-4xl mb-2">{isBombHolder ? '💣🔥' : '😮‍💨'}</p>
          <p className="text-white font-bold">{isBombHolder ? '폭탄이 당신에게!' : `폭탄: ${current.nameMap[currentBombHolder] || '?'}`}</p>
        </div>
        {isBombHolder && myChoice === null && (
          <div className="space-y-2">
            <p className="text-yellow-400 font-bold text-center text-lg">{currentQuiz.q}</p>
            <div className="flex gap-2">
              <input
                value={bombAnswer}
                onChange={(e) => setBombAnswer(e.target.value)}
                placeholder="정답 입력..."
                autoFocus
                className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700 outline-none"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && bombAnswer.trim()) {
                    const isCorrect = currentQuiz.acceptable.some(
                      (ans) => bombAnswer.trim().toLowerCase().includes(ans.toLowerCase())
                    );
                    if (isCorrect) {
                      const others = Object.keys(current.alive).filter((id) => current.alive[id] && id !== uid);
                      const nextHolder = others[Math.floor(Math.random() * others.length)];
                      await set(ref(realtimeDb, `games/${roomId}/bomb/round${current.round}/holder`), nextHolder);
                      setBombAnswer('');
                      setBombQuizIdx((prev) => prev + 1);
                      soundManager.play('bomb-pass');
                      await submitScore(10);
                    } else {
                      setBombAnswer('');
                    }
                  }
                }}
              />
              <button
                onClick={async () => {
                  const isCorrect = currentQuiz.acceptable.some(
                    (ans) => bombAnswer.trim().toLowerCase().includes(ans.toLowerCase())
                  );
                  if (isCorrect) {
                    const others = Object.keys(current.alive).filter((id) => current.alive[id] && id !== uid);
                    const nextHolder = others[Math.floor(Math.random() * others.length)];
                    await set(ref(realtimeDb, `games/${roomId}/bomb/round${current.round}/holder`), nextHolder);
                    setBombAnswer('');
                    setBombQuizIdx((prev) => prev + 1);
                    soundManager.play('bomb-pass');
                    await submitScore(10);
                  }
                }}
                className="px-5 py-3 bg-red-600 text-white rounded-xl font-bold"
              >전송</button>
            </div>
          </div>
        )}
        {renderResult()}
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

  if (gt === 'tapSurvival') {
    // 다른 플레이어 탭 현황 정렬
    const otherPlayers = Object.entries(otherTaps)
      .filter(([id]) => id !== uid)
      .map(([id, data]) => ({
        uid: id,
        name: data.displayName || current.nameMap[id] || id.slice(0, 6),
        count: data.count || 0,
        lastTapAt: data.lastTapAt || 0,
      }))
      .sort((a, b) => b.count - a.count);

    return (
      <div className="flex flex-col p-3 overflow-y-auto">
        {renderHeader()}
        {renderScoreBar()}
        {!scoreSubmittedRef.current ? (
          <div className="space-y-3">
            {/* 내 탭 카운트 */}
            <div className="text-center">
              <p className="text-6xl font-bold text-yellow-400">{tapCount}</p>
              <p className="text-gray-400 text-sm">내 탭 수</p>
            </div>

            {/* 동시 탭 알림 */}
            {simultaneousTaps.length > 0 && (
              <div className="bg-purple-500/20 border border-purple-500/40 rounded-xl px-4 py-2 text-center animate-bounce">
                <p className="text-purple-300 text-sm font-bold">
                  ⚡ {simultaneousTaps.join(', ')}와(과) 동시 클릭!
                </p>
              </div>
            )}

            {/* TAP 버튼 */}
            <button
              onPointerDown={async () => {
                soundManager.play('tap-hit');
                const newCount = tapCount + 1;
                setTapCount(newCount);
                setTapping(true);
                // 실시간으로 내 탭 정보를 RTDB에 기록
                await set(ref(realtimeDb, `games/${roomId}/taps/round${current.round}/${uid}`), {
                  count: newCount,
                  lastTapAt: Date.now(),
                  displayName,
                });
              }}
              onPointerUp={() => setTapping(false)}
              className={`w-full py-16 rounded-2xl text-3xl font-bold transition-all active:scale-95 ${
                tapping ? 'bg-yellow-500 text-black scale-95' : 'bg-yellow-600/30 text-yellow-400 border-2 border-yellow-500/50'
              }`}
            >
              👆 TAP!
            </button>

            {/* 실시간 다른 플레이어 탭 현황 */}
            {otherPlayers.length > 0 && (
              <div className="bg-gray-800/40 rounded-xl p-3">
                <p className="text-gray-500 text-xs mb-2 font-bold">🔥 실시간 탭 현황</p>
                <div className="space-y-1">
                  {otherPlayers.map((p) => {
                    const diff = Math.abs(Date.now() - p.lastTapAt);
                    const isSimul = diff < 200;
                    return (
                      <div key={p.uid} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                        isSimul ? 'bg-purple-500/20 ring-1 ring-purple-500/50' : ''
                      }`}>
                        <span className="text-white">
                          {isSimul && '⚡ '}{p.name}
                        </span>
                        <span className="text-yellow-400 font-bold">{p.count}회</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              onClick={async () => {
                await submitScore(tapCount);
                void advanceRound();
              }}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold"
            >제출 ({tapCount}회)</button>
          </div>
        ) : (
          renderResult()
        )}
        {renderMiniRanking()}
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
