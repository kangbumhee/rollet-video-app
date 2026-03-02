"use client";

import React, { useState, useEffect } from "react";
import type { GameComponentProps } from "../GameContainer";

function NumberGuessGame({ participantMap }: GameComponentProps) {
  const [targetNumber] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState<{ value: number; hint: string }[]>([]);
  const [found, setFound] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const aliveCount = Object.values(participantMap).filter((p) => p.alive).length;

  useEffect(() => {
    if (found || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [found, timeLeft]);

  const handleGuess = () => {
    const num = Number.parseInt(guess, 10);
    if (Number.isNaN(num) || num < 1 || num > 100) return;

    let hint = "";
    if (num === targetNumber) {
      hint = "정답! 🎉";
      setFound(true);
    } else if (num < targetNumber) {
      hint = "⬆️ 더 높은 숫자!";
    } else {
      hint = "⬇️ 더 낮은 숫자!";
    }

    setAttempts((prev) => [...prev, { value: num, hint }]);
    setGuess("");
  };

  if (timeLeft <= 0 && !found) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <span className="text-5xl">⏰</span>
        <p className="text-xl font-bold text-red-400">시간 초과!</p>
        <p className="text-gray-400">
          정답은 <span className="text-yellow-400 font-bold">{targetNumber}</span>이었습니다
        </p>
        <p className="text-sm text-gray-500">{attempts.length}번 시도</p>
      </div>
    );
  }

  if (found) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <span className="text-5xl">🎯</span>
        <p className="text-2xl font-bold text-green-400">정답! {targetNumber}</p>
        <p className="text-gray-400">{attempts.length}번 만에 맞추셨습니다!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 space-y-4">
      <div className="flex items-center justify-between w-full max-w-sm">
        <span className="text-sm text-gray-400">생존 {aliveCount}명</span>
        <span className={`text-lg font-bold ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-white"}`}>{timeLeft}초</span>
      </div>

      <h2 className="text-xl font-bold text-white">🔢 1~100 숫자 맞추기</h2>

      <div className="flex gap-2 w-full max-w-sm">
        <input
          type="number"
          min="1"
          max="100"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGuess()}
          placeholder="숫자 입력"
          className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-center text-lg
                     focus:outline-none focus:border-yellow-500"
        />
        <button
          onClick={handleGuess}
          disabled={!guess}
          className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl
                     disabled:opacity-30 hover:bg-yellow-400 active:scale-95 transition-all"
        >
          확인
        </button>
      </div>

      <div className="w-full max-w-sm space-y-2 max-h-40 overflow-y-auto">
        {[...attempts].reverse().map((a, i) => (
          <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
            <span className="text-white font-mono text-lg">{a.value}</span>
            <span className="text-sm">{a.hint}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">시도 횟수: {attempts.length}</p>
    </div>
  );
}

export default NumberGuessGame;
