'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameRound } from '@/hooks/useGameRound';
import { soundManager } from '@/lib/sounds/SoundManager';
import { auth } from '@/lib/firebase/config';
import GameHUD from './GameHUD';
import RoundTransition from './RoundTransition';
import WaitingForOthers from './WaitingForOthers';
import DrawGuessGame from './games/DrawGuessGame';
import FlappyBattleGame from './games/FlappyBattleGame';
import BigRouletteGame from './games/BigRouletteGame';
import TypingRaceGame from './games/TypingRaceGame';
import PriceGuessGame from './games/PriceGuessGame';
import BlindAuctionGame from './games/BlindAuctionGame';
import BombSurvivalGame from './games/BombSurvivalGame';
import TetrisBattleGame from './games/TetrisBattleGame';
import MemoryMatchGame from './games/MemoryMatchGame';
import SlitherBattleGame from './games/SlitherBattleGame';
import WeaponForgeGame from './games/WeaponForgeGame';

interface Props {
  roomId: string;
}

export default function GamePlayingView({ roomId }: Props) {
  const game = useGameRound(roomId);
  const [endCountdown, setEndCountdown] = useState(5);
  const [resetting, setResetting] = useState(false);
  const [countdownDone, setCountdownDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const prevPhaseRef = useRef<string>('');
  const prevRoundRef = useRef<number>(0);

  // ── 효과음: phase 변경 시 ──
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = game.phase;

    if (prev === game.phase) return;

    switch (game.phase) {
      case 'game_intro':
        soundManager.play('game-start');
        soundManager.playBGM('bgm-battle');
        break;
      case 'playing':
        soundManager.playBGM('bgm-battle');
        if (prev === 'round_result' || prev === 'advancing' || prev === 'game_intro') {
          soundManager.play('whoosh');
        }
        break;
      case 'round_result':
        soundManager.play('correct');
        break;
      case 'advancing':
        break;
      case 'final_result':
        soundManager.stopBGM();
        soundManager.play('win-fanfare');
        soundManager.playBGM('bgm-winner');
        break;
      case 'idle':
        soundManager.stopBGM();
        soundManager.playBGM('bgm-lobby');
        break;
    }
  }, [game.phase]);

  // ── 효과음: 라운드 변경 시 ──
  useEffect(() => {
    if (game.round > 0 && game.round !== prevRoundRef.current && prevRoundRef.current > 0) {
      soundManager.play('countdown-tick');
    }
    prevRoundRef.current = game.round;
  }, [game.round]);

  // ── 효과음: 제출 시 ──
  useEffect(() => {
    if (game.submitted && game.phase === 'playing') {
      soundManager.play('correct');
    }
  }, [game.submitted, game.phase]);

  // ── 시상식 5초 카운트다운 ──
  useEffect(() => {
    if (game.phase !== 'final_result') {
      setEndCountdown(5);
      setCountdownDone(false);
      setDismissed(false);
      setResetting(false);
      return;
    }
    setEndCountdown(5);
    setCountdownDone(false);
    setDismissed(false);
    const t = setInterval(() => {
      setEndCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          setCountdownDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [game.phase]);

  const handleDismissAward = useCallback(async () => {
    if (!countdownDone || resetting) return;
    setDismissed(true);
    setResetting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const res = await fetch(`/api/room/${roomId}/reset-game`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) console.error('dismiss reset failed:', res.status);
      }
    } catch (e) {
      console.error('dismiss reset error:', e);
    }
  }, [countdownDone, resetting, roomId]);

  // ── 모든 사람 나가면 자동 종료 ──
  useEffect(() => {
    if (
      game.phase === 'playing' &&
      game.progress.online === 0 &&
      game.progress.total > 0 &&
      !resetting
    ) {
      setResetting(true);
      (async () => {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            await fetch(`/api/room/${roomId}/reset-game`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch (e) {
          console.error('auto-end on empty room failed:', e);
        } finally {
          setResetting(false);
        }
      })();
    }
  }, [game.phase, game.progress.online, game.progress.total, resetting, roomId]);

  // ── 강제 종료 ──
  const handleForceEnd = useCallback(async () => {
    if (!confirm('게임을 강제 종료할까요?')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { alert('로그인이 필요합니다'); return; }
      const res = await fetch(`/api/room/${roomId}/reset-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || '종료 실패');
    } catch (e) {
      console.error('force end failed:', e);
      alert('종료 실패');
    }
  }, [roomId]);

  if (!game.uid) {
    return <div className="flex items-center justify-center h-64 text-white/30">로딩 중...</div>;
  }

  if (game.phase === 'idle' || game.phase === 'waiting') {
    return null;
  }

  const isStarter = game.startedBy === game.uid;

  // ── 최종 결과 (시상식) — 5초 후 터치하면 닫기 ──
  if (game.phase === 'final_result') {
    if (dismissed) return null;

    const sorted = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
    const myRank = sorted.findIndex(([uid]) => uid === game.uid) + 1;
    const winnerId = game.winnerId || sorted[0]?.[0];
    const winnerName = game.winnerName || (winnerId ? (game.nameMap[winnerId] || winnerId) : '');
    const winnerPhoto = winnerId && game.photoMap ? game.photoMap[winnerId] : null;

    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4 py-8 cursor-pointer"
        onClick={countdownDone ? handleDismissAward : undefined}
      >
        <div className="text-white/30 text-xs">
          {endCountdown > 0 ? `${endCountdown}초 후 닫을 수 있습니다` : '👆 화면을 터치하면 닫힙니다'}
        </div>

        <div className="text-4xl">🏆</div>
        <h2 className="text-2xl font-black text-white">게임 종료!</h2>

        {winnerId && (
          <div className="flex flex-col items-center gap-2">
            {winnerPhoto ? (
              <img
                src={winnerPhoto}
                alt={winnerName}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-neon-amber/50 shadow-lg shadow-neon-amber/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-neon-amber/20 ring-4 ring-neon-amber/50 flex items-center justify-center text-3xl">
                🥇
              </div>
            )}
            <p className="text-neon-amber font-bold text-lg">{winnerName}</p>
            <p className="text-white/40 text-sm">{sorted[0]?.[1] ?? 0}점</p>
          </div>
        )}

        <div className="w-full max-w-xs space-y-2">
          {sorted.slice(0, 10).map(([uid, score], i) => (
            <div key={uid} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              uid === game.uid ? 'bg-neon-magenta/20 text-neon-magenta font-bold ring-1 ring-neon-magenta/30' : 'bg-surface-base text-white/60'
            }`}>
              <span className="w-6 text-center font-bold text-xs">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </span>
              <span className="flex-1 truncate">{game.nameMap[uid] || uid.slice(0, 6)}</span>
              <span className="tabular-nums font-mono font-score">{score}점</span>
            </div>
          ))}
        </div>
        <p className="text-white/30 text-sm">내 순위: {myRank}위 | {game.scores[game.uid] ?? 0}점</p>
      </div>
    );
  }

  // ── game_intro / countdown / lobby ──
  if (game.phase === 'game_intro' || game.phase === 'countdown' || game.phase === 'lobby' || game.phase === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-4">
        <div className="text-5xl animate-bounce">🎮</div>
        <h2 className="text-xl font-bold text-white">{game.gameName || '게임'}</h2>
        <p className="text-white/40 text-sm animate-pulse">
          {game.phase === 'game_intro' ? '게임 준비 중...' :
           game.phase === 'countdown' ? '곧 시작합니다!' :
           game.phase === 'lobby' ? '참가자 대기 중...' :
           '대기 중...'}
        </p>
        <div className="flex items-center gap-2 text-white/20 text-xs">
          <div className="w-2 h-2 rounded-full bg-neon-cyan animate-ping" />
          <span>{Object.keys(game.scores).length}명 참가</span>
        </div>
      </div>
    );
  }

  const showTransition = game.phase === 'round_result';
  const showWaiting = game.phase === 'playing' && game.submitted;

  const roundMultiplier = Math.min(1 + (game.round - 1) * 0.2, 3.0);

  const commonProps = {
    roundData: game.roundData ?? {},
    round: game.round,
    myUid: game.uid!,
    timeLeft: game.timeLeft,
    onSubmit: game.submitAction,
    scores: game.scores,
    nameMap: game.nameMap,
    roomId,
  };

  const renderGame = () => {
    if (game.phase === 'playing' && !game.roundData) {
      return <div className="flex items-center justify-center h-40 text-white/20 animate-pulse">라운드 데이터 로딩 중...</div>;
    }
    if (showWaiting) {
      return <WaitingForOthers progress={game.progress} myRoundScore={game.myRoundScore} />;
    }
    if (game.phase !== 'playing') {
      return <div className="flex items-center justify-center h-40 text-white/20">다음 라운드 준비 중...</div>;
    }

    const gameType = game.gameType || (game.config as Record<string, string>)?.type || '';
    switch (gameType) {
      case 'drawGuess':      return <DrawGuessGame {...commonProps} />;
      case 'flappyBattle':   return <FlappyBattleGame {...commonProps} />;
      case 'bigRoulette':    return <BigRouletteGame {...commonProps} />;
      case 'typingBattle':   return <TypingRaceGame {...commonProps} />;
      case 'priceGuess':     return <PriceGuessGame {...commonProps} />;
      case 'blindAuction':   return <BlindAuctionGame {...commonProps} />;
      case 'bombSurvival':   return <BombSurvivalGame {...commonProps} />;
      case 'tetrisBattle':   return <TetrisBattleGame {...commonProps} />;
      case 'memoryMatch':    return <MemoryMatchGame {...commonProps} />;
      case 'slitherBattle':  return <SlitherBattleGame {...commonProps} />;
      case 'weaponForge':    return <WeaponForgeGame {...commonProps} />;
      default:
        return <div className="text-center text-white/30 py-10">알 수 없는 게임: {gameType}</div>;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A12]">
      <GameHUD
        round={game.round}
        totalRounds={game.totalRounds}
        timeLeft={game.timeLeft}
        scores={game.scores}
        nameMap={game.nameMap}
        myUid={game.uid}
        progress={game.progress}
        submitted={game.submitted}
        gameName={game.gameName}
      />

      {/* ★ 강제 종료 버튼 (게임 시작한 사람만) */}
      {isStarter && game.phase !== 'final_result' && (
        <button
          onClick={handleForceEnd}
          className="fixed top-14 right-3 z-[60] px-3 py-1.5 text-xs rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 active:scale-95 transition-all"
        >
          게임 종료
        </button>
      )}

      <div className="pt-24 pb-8 px-4">
        {game.phase === 'playing' && game.round > 1 && (
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-neon-amber/20 to-neon-magenta/20 border-2 border-neon-amber/40 shadow-lg shadow-neon-amber/10">
              <span className="text-2xl">🔥</span>
              <span className="text-2xl font-black text-neon-amber tabular-nums font-score">
                ×{roundMultiplier.toFixed(1)}
              </span>
              <span className="text-base font-bold text-neon-amber/80">배수</span>
            </div>
          </div>
        )}

        {showTransition && (
          <RoundTransition
            round={game.round}
            totalRounds={game.totalRounds}
            phase={game.phase}
            scores={game.scores}
            myUid={game.uid}
            myRoundScore={game.myRoundScore}
          />
        )}

        {renderGame()}
      </div>
    </div>
  );
}
