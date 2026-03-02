'use client';
import { useEffect, useRef } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

export function useGameSounds(phase?: string) {
  const prevPhase = useRef<string>('');
  const unlocked = useRef(false);

  // 첫 클릭 시 unlock
  useEffect(() => {
    const handleInteraction = () => {
      if (!unlocked.current) {
        unlocked.current = true;
        // IDLE이면 lobby BGM 시작
        if (!prevPhase.current || prevPhase.current === 'IDLE' || prevPhase.current === 'COOLDOWN') {
          soundManager.playBGM('bgm-lobby');
        }
      }
    };
    window.addEventListener('click', handleInteraction, { once: false });
    window.addEventListener('touchstart', handleInteraction, { once: false });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (!phase || phase === prevPhase.current) return;
    prevPhase.current = phase;

    switch (phase) {
      case 'IDLE':
      case 'COOLDOWN':
        soundManager.playBGM('bgm-lobby');
        break;
      case 'ANNOUNCING':
        soundManager.play('prize-reveal');
        soundManager.playBGM('bgm-lobby');
        break;
      case 'ENTRY_GATE':
        soundManager.play('ticket-get');
        soundManager.playBGM('bgm-lobby');
        break;
      case 'GAME_LOBBY':
        soundManager.playBGM('bgm-battle');
        break;
      case 'GAME_COUNTDOWN':
        soundManager.play('countdown-tick');
        soundManager.playBGM('bgm-battle');
        break;
      case 'GAME_PLAYING':
        soundManager.play('game-start');
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
