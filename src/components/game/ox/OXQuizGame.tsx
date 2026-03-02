"use client";

import React, { useState, useEffect } from "react";
import type { GameComponentProps } from "../GameContainer";

const QUIZ_QUESTIONS = [
  { q: "대한민국의 수도는 서울이다", a: true },
  { q: "지구에서 가장 큰 대양은 대서양이다", a: false },
  { q: "물의 화학식은 H2O이다", a: true },
  { q: "빛의 속도는 소리의 속도보다 느리다", a: false },
  { q: "파이(π)의 값은 약 3.14이다", a: true },
  { q: "일본의 수도는 오사카이다", a: false },
  { q: "다이아몬드는 탄소로 이루어져 있다", a: true },
  { q: "달에는 중력이 없다", a: false },
  { q: "인간의 몸에는 206개의 뼈가 있다", a: true },
  { q: "태양계에서 가장 큰 행성은 토성이다", a: false },
  { q: "커피의 원료는 커피 열매의 씨앗이다", a: true },
  { q: "에베레스트산은 아프리카에 있다", a: false },
  { q: "혈액형은 A, B, O, AB 4가지가 있다", a: true },
  { q: "바나나는 채소이다", a: false },
  { q: "한글은 세종대왕이 만들었다", a: true },
];

function OXQuizGame({ participantMap }: GameComponentProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameOver, setGameOver] = useState(false);

  const currentQ = QUIZ_QUESTIONS[questionIndex];
  const aliveCount = Object.values(participantMap).filter((p) => p.alive).length;

  const handleSelect = (answer: boolean | null) => {
    if (selected !== null || showResult) return;
    setSelected(answer);
    setShowResult(true);

    if (answer === currentQ.a) {
      setScore((s) => s + 1);
    }

    setTimeout(() => {
      if (questionIndex + 1 >= QUIZ_QUESTIONS.length) {
        setGameOver(true);
      } else {
        setQuestionIndex((i) => i + 1);
        setSelected(null);
        setShowResult(false);
        setTimeLeft(10);
      }
    }, 2000);
  };

  useEffect(() => {
    if (gameOver || showResult) return;
    if (timeLeft <= 0) {
      // 시간초과 - 자동으로 오답 처리
      setSelected(null);
      setShowResult(true);
      setTimeout(() => {
        if (questionIndex + 1 >= QUIZ_QUESTIONS.length) {
          setGameOver(true);
        } else {
          setQuestionIndex((i) => i + 1);
          setSelected(null);
          setShowResult(false);
          setTimeLeft(10);
        }
      }, 2000);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, gameOver, showResult, questionIndex]);

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <span className="text-5xl">🏆</span>
        <p className="text-2xl font-bold text-white">
          {score} / {QUIZ_QUESTIONS.length}
        </p>
        <p className="text-gray-400">최종 점수</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 space-y-6">
      <div className="flex items-center justify-between w-full max-w-sm">
        <span className="text-sm text-gray-400">
          문제 {questionIndex + 1}/{QUIZ_QUESTIONS.length}
        </span>
        <span className="text-sm text-gray-400">생존 {aliveCount}명</span>
      </div>

      <div className={`text-3xl font-bold ${timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-white"}`}>{timeLeft}</div>

      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
        <p className="text-lg font-medium text-white">{currentQ.q}</p>
      </div>

      <div className="flex gap-6">
        <button
          onClick={() => handleSelect(true)}
          disabled={selected !== null}
          className={`w-24 h-24 rounded-full text-4xl font-bold transition-all
            ${
              selected === true
                ? showResult && currentQ.a === true
                  ? "bg-green-500 scale-110"
                  : "bg-red-500 scale-90"
                : "bg-blue-600 hover:bg-blue-500 active:scale-95"
            }
            ${selected !== null ? "cursor-not-allowed" : ""}`}
        >
          ⭕
        </button>
        <button
          onClick={() => handleSelect(false)}
          disabled={selected !== null}
          className={`w-24 h-24 rounded-full text-4xl font-bold transition-all
            ${
              selected === false
                ? showResult && currentQ.a === false
                  ? "bg-green-500 scale-110"
                  : "bg-red-500 scale-90"
                : "bg-red-600 hover:bg-red-500 active:scale-95"
            }
            ${selected !== null ? "cursor-not-allowed" : ""}`}
        >
          ❌
        </button>
      </div>

      {showResult && (
        <p className={`text-lg font-bold ${selected === currentQ.a ? "text-green-400" : "text-red-400"}`}>
          {selected === currentQ.a ? "정답! 🎉" : `오답! 정답은 ${currentQ.a ? "O" : "X"}`}
        </p>
      )}

      <div className="text-sm text-gray-500">점수: {score}</div>
    </div>
  );
}

export default OXQuizGame;
