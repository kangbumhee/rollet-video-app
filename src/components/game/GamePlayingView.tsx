'use client';

import { useGameRound } from '@/hooks/useGameRound';
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

interface Props {
  roomId: string;
}

export default function GamePlayingView({ roomId }: Props) {
  const game = useGameRound(roomId);

  console.log('[GamePlayingView] state:', {
    uid: game.uid,
    phase: game.phase,
    round: game.round,
    gameType: game.gameType,
    roundData: game.roundData ? Object.keys(game.roundData) : null,
    submitted: game.submitted,
  });

  if (!game.uid) {
    return <div className="flex items-center justify-center h-64 text-white/30">로딩 중...</div>;
  }

  // 최종 결과
  if (game.phase === 'final_result') {
    const sorted = Object.entries(game.scores).sort((a, b) => b[1] - a[1]);
    const myRank = sorted.findIndex(([uid]) => uid === game.uid) + 1;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="text-4xl">🏆</div>
        <h2 className="text-2xl font-black text-white">게임 종료!</h2>
        {game.winnerId && (
          <p className="text-neon-amber font-bold text-lg">
            우승: {game.winnerName || game.winnerId}
          </p>
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

  // ★ game_intro / countdown / lobby 등 대기 상태
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
    // playing 상태인데 roundData가 아직 안 왔으면 대기
    if (game.phase === 'playing' && !game.roundData) {
      return <div className="flex items-center justify-center h-40 text-white/20 animate-pulse">라운드 데이터 로딩 중...</div>;
    }

    // 제출 완료 → 대기 화면
    if (showWaiting) {
      return <WaitingForOthers progress={game.progress} myRoundScore={game.myRoundScore} />;
    }

    // phase가 playing이 아니면 (advancing 등) 잠깐 대기
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
      <div className="pt-24 pb-8 px-4">
        {renderGame()}
      </div>
    </div>
  );
}
