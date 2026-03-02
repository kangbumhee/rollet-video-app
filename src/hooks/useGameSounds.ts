// src/hooks/useGameSounds.ts
'use client';

import { useEffect, useRef } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

export function useGameSounds(phase: string | null | undefined) {
  const prevPhase = useRef<string | null>(null);

  useEffect(() => {
    if (!phase || phase === prevPhase.current) return;
    prevPhase.current = phase;

    switch (phase) {
      case 'IDLE':
      case 'COOLDOWN':
        soundManager.stopBGM();
        break;
      case 'ANNOUNCING':
        soundManager.play('prize-reveal');
        soundManager.playBGM('bgm-lobby');
        break;
      case 'ENTRY_GATE':
        break; // BGM 계속
      case 'GAME_LOBBY':
        soundManager.play('game-start');
        break;
      case 'GAME_COUNTDOWN':
        soundManager.stopBGM();
        soundManager.play('countdown-tick');
        break;
      case 'GAME_PLAYING':
        soundManager.playBGM('bgm-battle');
        break;
      case 'GAME_RESULT':
        soundManager.stopBGM();
        break;
      case 'WINNER_ANNOUNCE':
        soundManager.play('win-fanfare');
        soundManager.playBGM('bgm-winner');
        break;
    }
  }, [phase]);
}
