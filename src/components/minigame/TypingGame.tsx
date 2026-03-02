'use client';

import { useState, useEffect, useRef } from 'react';

const WORDS = [
  '경품',
  '당첨',
  '행운',
  '축하',
  '이벤트',
  '선물',
  '참여',
  '응모',
  '도전',
  '기회',
  '파이팅',
  '최고',
  '대박',
  '화이팅',
  '사랑',
  '감사',
  '즐거움',
  '행복',
  '성공',
  '희망',
  '용기',
  '노력',
];

interface Props {
  onResult?: (msg: string) => void;
}

export default function TypingGame({ onResult }: Props) {
  const [playing, setPlaying] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [bestScore, setBestScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const nextWord = () => {
    setCurrentWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setInput('');
  };

  const startGame = () => {
    setPlaying(true);
    setScore(0);
    setTimeLeft(15);
    nextWord();
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!playing) return;
    if (timeLeft <= 0) {
      setPlaying(false);
      if (score > bestScore) setBestScore(score);
      if (score >= 5) {
        onResult?.(`⌨️ 타자 게임 ${score}단어 완료! 손가락이 불탄다!`);
      }
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [playing, timeLeft, score, bestScore, onResult]);

  const handleInput = (value: string) => {
    setInput(value);
    if (value === currentWord) {
      setScore((s) => s + 1);
      nextWord();
    }
  };

  if (!playing) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 text-center">
        <p className="text-sm text-gray-400 mb-2">타자 게임 ⌨️</p>
        {score > 0 && <p className="text-lg font-bold text-yellow-400 mb-2">{score}단어 완료!</p>}
        {bestScore > 0 && <p className="text-xs text-gray-500 mb-4">최고: {bestScore}단어</p>}
        <button
          onClick={startGame}
          className="px-8 py-2.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded-xl
                     hover:bg-green-500/30 active:scale-95 transition-all text-sm font-medium"
        >
          {score > 0 ? '다시 도전' : '시작하기'} (15초)
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 text-center">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">타자 게임 ⌨️</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-yellow-400 font-bold">{score}단어</span>
          <span className={`text-xs font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>{timeLeft}초</span>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-600 rounded-xl py-4 mb-4">
        <p className="text-2xl font-bold text-white">{currentWord}</p>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-center text-white
                   focus:outline-none focus:border-yellow-500/50 text-lg"
        autoFocus
        placeholder="여기에 입력..."
      />
    </div>
  );
}
