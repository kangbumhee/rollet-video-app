'use client';

import { useMemo } from 'react';

interface Props {
  round: number;
  totalRounds: number;
  timeLeft: number;
  scores: Record<string, number>;
  nameMap: Record<string, string>;
  myUid: string;
  progress: { total: number; done: number; online: number; onlineDone: number };
  submitted: boolean;
  gameName: string;
}

export default function GameHUD({
  round, totalRounds, timeLeft, scores, nameMap,
  myUid, progress, submitted, gameName,
}: Props) {
  const leaderboard = useMemo(() => {
    return Object.entries(scores)
      .map(([uid, score]) => ({
        uid,
        name: nameMap[uid] || uid.slice(0, 6),
        score,
        isMe: uid === myUid,
      }))
      .sort((a, b) => b.score - a.score);
  }, [scores, nameMap, myUid]);

  const myRank = leaderboard.findIndex((p) => p.isMe) + 1;
  const isUrgent = timeLeft <= 5 && timeLeft > 0;
  const progressPct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0A0A12]/90 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">{gameName}</span>
          <span className="text-white font-bold text-sm">
            <span className="text-neon-magenta">R{round}</span>
            <span className="text-white/30">/{totalRounds}</span>
          </span>
        </div>
        <div className={isUrgent ? 'text-2xl font-black tabular-nums font-score text-red-500 animate-pulse scale-125' : 'text-2xl font-black tabular-nums font-score text-white'}>
          {timeLeft}
        </div>
        <div className="text-white text-sm font-bold">
          <span className="text-neon-amber">#{myRank || '-'}</span>
          <span className="text-white/30 text-xs ml-1">/ {leaderboard.length}</span>
        </div>
      </div>
      <div className="px-4 py-1 bg-[#0A0A12]/70">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-surface-base rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[11px] text-white/30 tabular-nums whitespace-nowrap">
            {progress.done}/{progress.total} 완료
          </span>
        </div>
        {submitted && (
          <p className="text-[11px] text-neon-cyan mt-0.5 animate-pulse">
            ✓ 제출완료 — 다른 참가자 대기중...
          </p>
        )}
      </div>
      <div className="fixed right-2 top-24 w-32 pointer-events-auto">
        <div className="bg-[#0A0A12]/90 backdrop-blur-md rounded-lg p-2 border border-white/[0.06]">
          <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.2em] mb-1">LIVE RANK</p>
          {leaderboard.slice(0, 5).map((p, i) => (
            <div
              key={p.uid}
              className={p.isMe ? 'flex items-center gap-1 text-[11px] rounded px-1 py-0.5 mb-0.5 bg-neon-magenta/20 text-neon-magenta font-bold' : i === 0 ? 'flex items-center gap-1 text-[11px] rounded px-1 py-0.5 mb-0.5 text-neon-amber' : 'flex items-center gap-1 text-[11px] rounded px-1 py-0.5 mb-0.5 text-white/40'}
            >
              <span className="w-3 text-center text-[10px]">{i === 0 ? '👑' : i + 1}</span>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="tabular-nums font-mono font-score">{p.score}</span>
            </div>
          ))}
          {myRank > 5 && (
            <>
              <div className="text-center text-white/10 text-[9px]">···</div>
              <div className="flex items-center gap-1 text-[11px] bg-neon-magenta/15 rounded px-1 py-0.5 text-neon-magenta font-bold">
                <span className="w-3 text-center text-[10px]">{myRank}</span>
                <span className="flex-1 truncate">{nameMap[myUid]}</span>
                <span className="tabular-nums font-mono font-score">{scores[myUid] ?? 0}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
