// src/components/game/GameCountdown.tsx
"use client";

import React, { useState, useEffect } from "react";

interface GameCountdownProps {
  gameName: string;
  gameIcon: string;
  participantCount: number;
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
      <p className="text-lg text-gray-400 mb-2">{gameName}</p>
      <p className="text-sm text-gray-500 mb-8">참가자 {participantCount}명</p>

      {count > 0 ? (
        <div className="relative">
          <span key={count} className="text-8xl font-black text-yellow-500 animate-ping-once" style={{ animation: "countPop 0.8s ease-out" }}>
            {count}
          </span>
        </div>
      ) : (
        <span className="text-5xl font-black text-green-400 animate-pulse">START!</span>
      )}
    </div>
  );
}
