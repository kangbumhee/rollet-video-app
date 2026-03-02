'use client';
import { useState, useEffect, useRef } from 'react';

interface Props { onResult?: (msg: string) => void; }

function genQuestion(): { q: string; options: number[]; answer: number } {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const op = ['+', '-'][Math.floor(Math.random() * 2)];
  const answer = op === '+' ? a + b : a - b;
  const options = [answer];
  while (options.length < 4) {
    const fake = answer + Math.floor(Math.random() * 11) - 5;
    if (!options.includes(fake)) options.push(fake);
  }
  return { q: `${a} ${op} ${b}`, options: options.sort(() => Math.random() - 0.5), answer };
}

export default function SpeedCalc({ onResult }: Props) {
  const [playing, setPlaying] = useState(false);
  const [question, setQuestion] = useState(genQuestion());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [best, setBest] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setPlaying(true); setScore(0); setTimeLeft(15); setFeedback(null);
    setQuestion(genQuestion());
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
      onResult?.(`➕ 빠른 계산 ${score}문제 정답! (최고: ${nb}문제)`);
    }
  }, [playing]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const answer = (num: number) => {
    if (!playing) return;
    if (num === question.answer) {
      setScore((s) => s + 1);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }
    setTimeout(() => { setFeedback(null); setQuestion(genQuestion()); }, 300);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">➕ 빠른 계산</h3>
      {playing ? (
        <>
          <div className="flex justify-between w-full text-sm">
            <span className="text-green-400 font-bold">정답: {score}</span>
            <span className={`font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>⏱ {timeLeft}초</span>
          </div>
          <p className={`text-3xl font-bold py-2 transition-colors ${feedback === 'correct' ? 'text-green-400' : feedback === 'wrong' ? 'text-red-400' : 'text-white'}`}>
            {question.q} = ?
          </p>
          <div className="grid grid-cols-2 gap-2 w-full">
            {question.options.map((opt, i) => (
              <button key={i} onClick={() => answer(opt)} className="p-3 bg-gray-700 text-white rounded-lg font-bold text-xl hover:bg-gray-600 transition">{opt}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center">
          {score > 0 && <p className="text-green-400 font-bold text-xl mb-2">결과: {score}문제</p>}
          <button onClick={start} className="px-8 py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-500 transition">
            {score > 0 ? '다시하기' : '시작하기'}
          </button>
          {best > 0 && <p className="text-yellow-400 text-sm mt-2">최고: {best}문제</p>}
        </div>
      )}
    </div>
  );
}
