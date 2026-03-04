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
    if (!game.roundData || game.phase !== 'playing') {
      return <div className="flex items-center justify-center h-40 text-white/20">라운드 준비 중...</div>;
    }
    if (showWaiting) {
      return <WaitingForOthers progress={game.progress} myRoundScore={game.myRoundScore} />;
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
