'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const WORDS = [
  '사과', '바나나', '컴퓨터', '대한민국', '프로그래밍', '치킨', '피자', '햄버거',
  '아이스크림', '초콜릿', '자동차', '비행기', '기차', '학교', '도서관', '병원',
  '소방서', '경찰서', '우체국', '백화점', '마트', '공원', '운동장', '수영장',
  '영화관', '노래방', '카페', '식당', '약국', '미용실', '편의점', '주유소',
];

interface Props {
  onResult?: (msg: string) => void;
}

export default function TypingGame({ onResult }: Props) {
  const [playing, setPlaying] = useState(false);
  const [word, setWord] = useState('');
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nextWord = useCallback(() => {
    setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setInput('');
  }, []);

  const startGame = () => {
    setPlaying(true); setScore(0); setTimeLeft(15);
    nextWord();
    inputRef.current?.focus();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPlaying(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!playing && score > 0) {
      const nb = Math.max(bestScore, score);
      setBestScore(nb);
      onResult?.(`⌨️ 타자 게임 ${score}점! (최고: ${nb}점)`);
    }
  }, [playing]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleInput = (value: string) => {
    setInput(value);
    if (value.trim() === word) {
      setScore((s) => s + 1);
      nextWord();
    }
  };

  if (!playing) {
    return (
      <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
        <h3 className="text-white font-bold text-lg">⌨️ 타자 게임</h3>
        <div className="text-center">
          {score > 0 && <p className="text-green-400 font-bold text-xl mb-2">결과: {score}점</p>}
          <button
            onClick={startGame}
            className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition"
          >
            {score > 0 ? '다시하기' : '시작하기'}
          </button>
          {bestScore > 0 && <p className="text-yellow-400 text-sm mt-2">최고: {bestScore}점</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">⌨️ 타자 게임</h3>
      <div className="flex justify-between w-full text-sm">
        <span className="text-green-400 font-bold">점수: {score}</span>
        <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>⏱ {timeLeft}초</span>
      </div>
      <p className="text-3xl text-white font-bold py-4">{word}</p>
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        className="w-full p-3 rounded-lg bg-gray-700 text-white text-center text-lg outline-none focus:ring-2 focus:ring-purple-500"
        autoFocus
        placeholder="여기에 입력하세요"
      />
    </div>
  );
}
