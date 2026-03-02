'use client';
import { useState, useEffect, useRef } from 'react';

interface Props { onResult?: (msg: string) => void; }

function genProblem(): { q: string; a: number } {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number;
  let b: number;
  let ans: number;
  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 1; b = Math.floor(Math.random() * 50) + 1; ans = a + b; break;
    case '-':
      a = Math.floor(Math.random() * 50) + 10; b = Math.floor(Math.random() * a); ans = a - b; break;
    case '×':
      a = Math.floor(Math.random() * 12) + 2; b = Math.floor(Math.random() * 12) + 2; ans = a * b; break;
    default:
      a = 1; b = 1; ans = 2;
  }
  return { q: `${a} ${op} ${b} = ?`, a: ans };
}

export default function MathGame({ onResult }: Props) {
  const [playing, setPlaying] = useState(false);
  const [problem, setProblem] = useState(genProblem());
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [best, setBest] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setPlaying(true); setScore(0); setTimeLeft(20);
    setProblem(genProblem()); setInput('');
    inputRef.current?.focus();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!playing && score > 0) {
      const nb = Math.max(best, score);
      setBest(nb);
      onResult?.(`🧮 암산 게임 ${score}문제 정답! (최고: ${nb}문제)`);
    }
  }, [playing]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const submit = () => {
    if (!playing) return;
    const num = parseInt(input, 10);
    if (num === problem.a) {
      setScore((s) => s + 1);
      setProblem(genProblem());
      setInput('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🧮 암산 게임</h3>
      {playing ? (
        <>
          <div className="flex justify-between w-full text-sm">
            <span className="text-green-400 font-bold">정답: {score}</span>
            <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>⏱ {timeLeft}초</span>
          </div>
          <p className="text-white font-bold text-3xl py-3">{problem.q}</p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.replace(/[^0-9-]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              autoFocus
              className="w-28 p-2 rounded-lg bg-gray-700 text-white text-center text-xl outline-none"
              placeholder="답"
            />
            <button onClick={submit} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition">확인</button>
          </div>
        </>
      ) : (
        <div className="text-center">
          {score > 0 && <p className="text-green-400 font-bold text-xl mb-2">결과: {score}문제</p>}
          <button onClick={start} className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition">
            {score > 0 ? '다시하기' : '시작하기'}
          </button>
          {best > 0 && <p className="text-yellow-400 text-sm mt-2">최고: {best}문제</p>}
        </div>
      )}
    </div>
  );
}
