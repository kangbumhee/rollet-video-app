"use client";

import React, { useState, useEffect } from "react";

interface GameCountdownProps {
  gameName: string; gameIcon: string; participantCount: number;
}

export function GameCountdown({ gameName, gameIcon, participantCount }: GameCountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count <= 0) return;
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="flex flex-col items-center justify-center h-72">
      <span className="text-4xl mb-4">{gameIcon}</span>
      <p className="text-lg text-white/30 mb-2">{gameName}</p>
      <p className="text-sm text-white/20 mb-8">참가자 {participantCount}명</p>

      {count > 0 ? (
        <div className="relative">
          <span key={count} className="text-8xl font-black text-neon-magenta animate-ping-once" style={{ animation: "countPop 0.8s ease-out", textShadow: "0 0 30px rgba(255,45,120,0.5)" }}>
            {count}
          </span>
        </div>
      ) : (
        <span className="text-5xl font-black text-emerald-400 animate-pulse" style={{ textShadow: "0 0 20px rgba(52,211,153,0.5)" }}>START!</span>
      )}
    </div>
  );
}
