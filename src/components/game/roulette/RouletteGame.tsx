"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { GameComponentProps } from "../GameContainer";

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F8C471",
  "#82E0AA",
];

function RouletteGame({ participantMap }: GameComponentProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);

  const participants = Object.entries(participantMap)
    .filter(([, p]) => p.alive)
    .map(([id, p]) => ({ id, name: p.displayName }));

  const segmentAngle = participants.length > 0 ? 360 / participants.length : 360;

  const spin = useCallback(() => {
    if (spinning || participants.length === 0) return;
    setSpinning(true);
    setResult(null);

    const extraSpins = 5 * 360;
    const randomAngle = Math.random() * 360;
    const totalRotation = rotation + extraSpins + randomAngle;

    setRotation(totalRotation);

    setTimeout(() => {
      const normalizedAngle = totalRotation % 360;
      const winnerIndex = Math.floor((360 - normalizedAngle) / segmentAngle) % participants.length;
      setResult(participants[winnerIndex]?.name || "");
      setSpinning(false);
    }, 4000);
  }, [participants, rotation, segmentAngle, spinning]);

  useEffect(() => {
    const timer = setTimeout(() => spin(), 2000);
    return () => clearTimeout(timer);
  }, [spin]);

  return (
    <div className="flex flex-col items-center p-4 space-y-6">
      <h2 className="text-xl font-bold text-white">🎰 룰렛</h2>
      <p className="text-sm text-gray-400">생존자 {participants.length}명</p>

      <div className="relative w-64 h-64">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-2xl">▼</div>

        <svg
          viewBox="0 0 200 200"
          className="w-full h-full transition-transform duration-[4000ms] ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {participants.map((p, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = startAngle + segmentAngle;
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            const x1 = 100 + 95 * Math.cos(startRad);
            const y1 = 100 + 95 * Math.sin(startRad);
            const x2 = 100 + 95 * Math.cos(endRad);
            const y2 = 100 + 95 * Math.sin(endRad);
            const largeArc = segmentAngle > 180 ? 1 : 0;
            const midRad = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
            const tx = 100 + 60 * Math.cos(midRad);
            const ty = 100 + 60 * Math.sin(midRad);

            return (
              <g key={p.id}>
                <path
                  d={`M100,100 L${x1},${y1} A95,95 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={COLORS[i % COLORS.length]}
                  stroke="#1a1a2e"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#000"
                  fontSize={participants.length > 8 ? "6" : "8"}
                  fontWeight="bold"
                >
                  {p.name.slice(0, 4)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {spinning && <p className="text-yellow-400 animate-pulse font-bold">룰렛 돌아가는 중...</p>}

      {result && (
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-yellow-400">🎉 {result}</p>
          <p className="text-sm text-gray-400">당첨!</p>
        </div>
      )}
    </div>
  );
}

export default RouletteGame;
