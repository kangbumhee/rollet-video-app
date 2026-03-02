"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { GameComponentProps } from "../GameContainer";

function SpeedClickGame({ participantMap }: GameComponentProps) {
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [countdown, setCountdown] = useState(3);

  const aliveCount = Object.values(participantMap).filter((p) => p.alive).length;

  useEffect(() => {
    if (phase !== "ready") return;
    if (countdown <= 0) {
      setPhase("playing");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      setPhase("done");
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const handleClick = useCallback(() => {
    if (phase !== "playing") return;
    setClicks((c) => c + 1);
  }, [phase]);

  if (phase === "ready") {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <h2 className="text-xl font-bold text-white">👆 빠른 클릭</h2>
        <p className="text-gray-400">10초 안에 최대한 많이 클릭하세요!</p>
        <span className={`text-6xl font-bold ${countdown <= 1 ? "text-red-500" : "text-yellow-400"} animate-pulse`}>{countdown}</span>
      </div>
    );
  }

  if (phase === "done") {
    const cps = (clicks / 10).toFixed(1);
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <span className="text-5xl">🏆</span>
        <p className="text-3xl font-bold text-yellow-400">{clicks}회</p>
        <p className="text-gray-400">초당 {cps}회 클릭</p>
        <p className="text-sm text-gray-500">
          {Number(cps) >= 8 ? "🔥 초인적 속도!" : Number(cps) >= 6 ? "👏 대단해요!" : Number(cps) >= 4 ? "👍 잘했어요!" : "💪 다음엔 더 빠르게!"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 space-y-4">
      <div className="flex items-center justify-between w-full max-w-sm">
        <span className="text-sm text-gray-400">생존 {aliveCount}명</span>
        <span className={`text-xl font-bold ${timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-white"}`}>{timeLeft}초</span>
      </div>

      <p className="text-4xl font-bold text-yellow-400">{clicks}</p>

      <button
        onClick={handleClick}
        className="w-48 h-48 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500
                   text-black text-2xl font-bold shadow-2xl
                   active:scale-90 active:from-yellow-300 active:to-orange-400
                   transition-transform duration-75 select-none"
      >
        👆
        <br />
        TAP!
      </button>

      <div className="w-full max-w-sm bg-gray-700 rounded-full h-2">
        <div className="bg-yellow-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(timeLeft / 10) * 100}%` }} />
      </div>
    </div>
  );
}

export default SpeedClickGame;
