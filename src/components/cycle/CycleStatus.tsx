// src/components/cycle/CycleStatus.tsx
'use client';

import React from 'react';
import { useCycle } from '@/hooks/useCycle';
import { NextPrizeCountdown } from './NextPrizeCountdown';
import { PhaseIndicator } from './PhaseIndicator';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface CycleStatusProps {
  roomId: string;
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  IDLE: { label: '대기 중', color: 'bg-gray-500' },
  ANNOUNCING: { label: '🎁 경품 소개', color: 'bg-blue-500' },
  ENTRY_GATE: { label: '🎫 입장 게이트', color: 'bg-purple-500' },
  GAME_LOBBY: { label: '🎮 참가 접수', color: 'bg-green-500' },
  GAME_COUNTDOWN: { label: '⏱️ 카운트다운', color: 'bg-yellow-500' },
  GAME_PLAYING: { label: '⚔️ 게임 진행', color: 'bg-red-500' },
  GAME_RESULT: { label: '📊 결과 발표', color: 'bg-orange-500' },
  WINNER_ANNOUNCE: { label: '🏆 당첨자 발표', color: 'bg-yellow-500' },
  COOLDOWN: { label: '☕ 쿨다운', color: 'bg-gray-500' },
};

export function CycleStatus({ roomId }: CycleStatusProps) {
  const { cycle, isLoading, phaseRemaining } = useCycle(roomId);

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-gray-800 rounded-xl" />;
  }

  if (!cycle || cycle.currentPhase === 'IDLE') {
    return <NextPrizeCountdown nextSlot={cycle?.nextSlot || null} />;
  }

  const phaseInfo = PHASE_LABELS[cycle.currentPhase] || PHASE_LABELS.IDLE;

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Badge className={`${phaseInfo.color} text-white`}>{phaseInfo.label}</Badge>
        <span className="text-sm text-gray-400">
          {phaseRemaining > 0 ? `${phaseRemaining}초 남음` : '전환 중...'}
        </span>
      </div>

      {cycle.currentPrizeTitle && (
        <div className="flex items-center gap-3">
          {cycle.currentPrizeImage && (
            <Image
              src={cycle.currentPrizeImage}
              alt=""
              width={48}
              height={48}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div>
            <p className="text-white font-medium text-sm">{cycle.currentPrizeTitle}</p>
            <p className="text-xs text-gray-400">
              {cycle.entryType === 'VIDEO' ? '📹 영상 시청 입장' : '📺 광고 시청 입장'}
            </p>
          </div>
        </div>
      )}

      <PhaseIndicator currentPhase={cycle.currentPhase} />

      {cycle.currentPhase === 'COOLDOWN' && cycle.nextSlot && (
        <p className="text-xs text-gray-500 text-center">다음 경품: {cycle.nextSlot.replace('T', ' ')} KST</p>
      )}
    </div>
  );
}
