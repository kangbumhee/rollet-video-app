// src/lib/cycle/phases.ts
import type { CyclePhase } from '@/types/cycle';

export interface PhaseConfig {
  phase: CyclePhase;
  durationSec: number;
  description: string;
}

export const CYCLE_PHASES: PhaseConfig[] = [
  {
    phase: 'ANNOUNCING',
    durationSec: 120,
    description: '이번 경품을 소개합니다',
  },
  {
    phase: 'ENTRY_GATE',
    durationSec: 180,
    description: '입장 게이트 - 광고 또는 영상을 시청하세요',
  },
  {
    phase: 'GAME_LOBBY',
    durationSec: 60,
    description: '게임 참가자를 모집합니다',
  },
  {
    phase: 'GAME_COUNTDOWN',
    durationSec: 5,
    description: '게임 시작!',
  },
  {
    phase: 'GAME_PLAYING',
    durationSec: 600,
    description: '게임이 진행 중입니다',
  },
  {
    phase: 'GAME_RESULT',
    durationSec: 30,
    description: '게임 결과를 확인합니다',
  },
  {
    phase: 'WINNER_ANNOUNCE',
    durationSec: 60,
    description: '당첨자를 발표합니다!',
  },
  {
    phase: 'COOLDOWN',
    durationSec: 745,
    description: '다음 경품을 기다려주세요',
  },
];

export const TOTAL_CYCLE_SECONDS = CYCLE_PHASES.reduce((sum, p) => sum + p.durationSec, 0);

export function getPhaseStartOffset(phaseIndex: number): number {
  let offset = 0;
  for (let i = 0; i < phaseIndex && i < CYCLE_PHASES.length; i++) {
    offset += CYCLE_PHASES[i].durationSec;
  }
  return offset;
}

export function getPhaseIndex(phase: CyclePhase): number {
  return CYCLE_PHASES.findIndex((p) => p.phase === phase);
}

export function getPhaseByElapsed(elapsedSec: number): PhaseConfig {
  let cumulative = 0;
  for (const pc of CYCLE_PHASES) {
    cumulative += pc.durationSec;
    if (elapsedSec < cumulative) return pc;
  }
  return CYCLE_PHASES[CYCLE_PHASES.length - 1];
}
