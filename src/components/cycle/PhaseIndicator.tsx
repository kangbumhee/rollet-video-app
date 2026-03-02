// src/components/cycle/PhaseIndicator.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { CyclePhase } from '@/types/cycle';

const PHASES_ORDER: { phase: CyclePhase; icon: string; short: string }[] = [
  { phase: 'ANNOUNCING', icon: '🎁', short: '소개' },
  { phase: 'ENTRY_GATE', icon: '🎫', short: '입장' },
  { phase: 'GAME_LOBBY', icon: '👥', short: '대기' },
  { phase: 'GAME_PLAYING', icon: '⚔️', short: '게임' },
  { phase: 'WINNER_ANNOUNCE', icon: '🏆', short: '발표' },
];

interface PhaseIndicatorProps {
  currentPhase: CyclePhase;
}

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIndex = PHASES_ORDER.findIndex((p) => {
    if (currentPhase === 'GAME_COUNTDOWN' || currentPhase === 'GAME_RESULT') {
      return p.phase === 'GAME_PLAYING';
    }
    return p.phase === currentPhase;
  });

  return (
    <div className="flex items-center justify-between w-full">
      {PHASES_ORDER.map((p, index) => {
        const isActive = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <React.Fragment key={p.phase}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all',
                  isActive && 'bg-prize-500 scale-110 shadow-lg shadow-prize-500/30',
                  isPast && 'bg-green-600',
                  !isActive && !isPast && 'bg-gray-700'
                )}
              >
                {isPast ? '✓' : p.icon}
              </div>
              <span className={cn('text-[10px] mt-1', isActive ? 'text-prize-400 font-medium' : 'text-gray-500')}>
                {p.short}
              </span>
            </div>
            {index < PHASES_ORDER.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-1', isPast ? 'bg-green-600' : 'bg-gray-700')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
