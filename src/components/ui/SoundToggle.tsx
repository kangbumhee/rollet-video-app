'use client';

import { useState, useEffect } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface SoundToggleProps {
  className?: string;
  size?: 'default' | 'sm';
}

export function SoundToggle({ className, size = 'default' }: SoundToggleProps) {
  // ★ 서버/클라이언트 모두 true로 시작 → hydration 일치
  const [sfx, setSfx] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [mounted, setMounted] = useState(false);

  // ★ 마운트 후에만 실제 localStorage 값 반영
  useEffect(() => {
    setMounted(true);
    setSfx(soundManager.sfxEnabled);
    setBgm(soundManager.bgmEnabled);
  }, []);

  const isSm = size === 'sm';
  const btnClass = isSm ? 'px-1.5 py-0.5 rounded text-[10px]' : 'px-2 py-1 rounded text-xs';
  const gapClass = isSm ? 'gap-1' : 'gap-2';

  const handleToggleSfx = () => {
    const newVal = soundManager.toggleSFX();
    setSfx(newVal);
  };

  const handleToggleBgm = () => {
    const newVal = soundManager.toggleBGM();
    setBgm(newVal);
  };

  // ★ 마운트 전에는 기본 스타일(on)로 렌더 — 서버 HTML과 일치
  const sfxOn = mounted ? sfx : true;
  const bgmOn = mounted ? bgm : true;

  return (
    <div className={`flex items-center shrink-0 ${gapClass} ${className ?? ''}`}>
      <button
        onClick={handleToggleSfx}
        className={`${btnClass} transition-colors ${
          sfxOn
            ? 'bg-neon-amber/20 text-neon-amber border border-neon-amber/25'
            : 'bg-surface-elevated text-white/30 border border-white/[0.06]'
        }`}
        title="효과음 on/off"
      >
        {sfxOn ? '🔊' : '🔇'} 효과음
      </button>
      <button
        onClick={handleToggleBgm}
        className={`${btnClass} transition-colors ${
          bgmOn
            ? 'bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/25'
            : 'bg-surface-elevated text-white/30 border border-white/[0.06]'
        }`}
        title="배경음 on/off"
      >
        {bgmOn ? '🎵' : '🔇'} BGM
      </button>
    </div>
  );
}
