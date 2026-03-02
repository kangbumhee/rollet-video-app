// src/components/ui/SoundToggle.tsx
'use client';

import { useState } from 'react';
import { soundManager } from '@/lib/sounds/SoundManager';

export function SoundToggle() {
  const [sfx, setSfx] = useState(soundManager.sfxEnabled);
  const [bgm, setBgm] = useState(soundManager.bgmEnabled);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setSfx(soundManager.toggleSFX())}
        className={`px-2 py-1 rounded text-xs transition-colors ${
          sfx ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'
        }`}
        title="효과음 on/off"
      >
        {sfx ? '🔊' : '🔇'} 효과음
      </button>
      <button
        onClick={() => setBgm(soundManager.toggleBGM())}
        className={`px-2 py-1 rounded text-xs transition-colors ${
          bgm ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'
        }`}
        title="배경음 on/off"
      >
        {bgm ? '🎵' : '🔇'} BGM
      </button>
    </div>
  );
}
