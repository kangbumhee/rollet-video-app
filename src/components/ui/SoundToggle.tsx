// src/components/ui/SoundToggle.tsx
'use client';

import { useState } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

interface SoundToggleProps {
  className?: string;
  size?: 'default' | 'sm';
}

export function SoundToggle({ className, size = 'default' }: SoundToggleProps) {
  const [sfx, setSfx] = useState(soundManager.sfxEnabled);
  const [bgm, setBgm] = useState(soundManager.bgmEnabled);
  const isSm = size === 'sm';
  const btnClass = isSm ? 'px-1.5 py-0.5 rounded text-[10px]' : 'px-2 py-1 rounded text-xs';
  const gapClass = isSm ? 'gap-1' : 'gap-2';

  return (
    <div className={`flex items-center shrink-0 ${gapClass} ${className ?? ''}`}>
      <button
        onClick={() => setSfx(soundManager.toggleSFX())}
        className={`${btnClass} transition-colors ${sfx ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'}`}
        title="효과음 on/off"
      >
        {sfx ? '🔊' : '🔇'} 효과음
      </button>
      <button
        onClick={() => setBgm(soundManager.toggleBGM())}
        className={`${btnClass} transition-colors ${bgm ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}
        title="배경음 on/off"
      >
        {bgm ? '🎵' : '🔇'} BGM
      </button>
    </div>
  );
}
