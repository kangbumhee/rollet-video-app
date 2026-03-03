'use client';
import { useEffect, useRef } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

export function useGameSounds(phase?: string, gameType?: string) {
  const prevPhase = useRef<string>('');
  const unlocked = useRef(false);

  // 첫 인터랙션에서 unlock
  useEffect(() => {
    const handleInteraction = () => {
      if (!unlocked.current) {
        unlocked.current = true;
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

      // ── 정규게임 phase ──
      case 'game_intro':
        soundManager.play('game-start');
        // 게임 종류별 BGM
        if (gameType === 'weaponForge' || gameType === 'bigRoulette') {
          soundManager.playBGM('bgm-tension');
        } else {
          soundManager.playBGM('bgm-battle');
        }
        break;
      case 'round_waiting':
        soundManager.play('whoosh');
        break;
      case 'final_result':
        soundManager.stopBGM();
        soundManager.play('win-fanfare');
        break;
    }
  }, [phase, gameType]);
}
