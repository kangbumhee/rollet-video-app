// src/components/game/rps/RPSTournamentBracket.tsx
"use client";

import React from "react";

interface RPSTournamentBracketProps {
  participantMap: Record<
    string,
    {
      displayName: string;
      photoURL: string | null;
      level: number;
      alive: boolean;
    }
  >;
  currentRound: number;
}

export function RPSTournamentBracket({ participantMap, currentRound }: RPSTournamentBracketProps) {
  const participants = Object.entries(participantMap);
  const alive = participants.filter(([, p]) => p.alive);
  const eliminated = participants.filter(([, p]) => !p.alive);

  return (
    <div className="w-full max-w-md bg-gray-800/50 rounded-xl p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">🏅 토너먼트 현황 (라운드 {currentRound})</h3>

      {/* 생존자 */}
      <div className="mb-3">
        <p className="text-xs text-green-400 mb-1">생존 ({alive.length}명)</p>
        <div className="flex flex-wrap gap-1">
          {alive.map(([uid, p]) => (
            <span
              key={uid}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400"
            >
              <span className="w-4 h-4 rounded-full bg-gray-700 overflow-hidden inline-flex items-center justify-center text-[8px]">
                {p.photoURL ? <img src={p.photoURL} alt="" className="w-full h-full object-cover" /> : p.displayName[0]}
              </span>
              {p.displayName}
            </span>
          ))}
        </div>
      </div>

      {/* 탈락자 */}
      {eliminated.length > 0 && (
        <div>
          <p className="text-xs text-red-400 mb-1">탈락 ({eliminated.length}명)</p>
          <div className="flex flex-wrap gap-1">
            {eliminated.map(([uid, p]) => (
              <span
                key={uid}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-400 line-through opacity-50"
              >
                {p.displayName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
