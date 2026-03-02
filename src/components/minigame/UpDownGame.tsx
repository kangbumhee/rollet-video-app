'use client';
import { useState } from 'react';

interface Props { onResult?: (msg: string) => void; }

export default function UpDownGame({ onResult }: Props) {
  const [answer, setAnswer] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [input, setInput] = useState('');
  const [hint, setHint] = useState('1~100 숫자를 맞춰보세요!');
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const [range, setRange] = useState({ min: 1, max: 100 });

  const reset = () => {
    setAnswer(Math.floor(Math.random() * 100) + 1);
    setInput('');
    setHint('1~100 숫자를 맞춰보세요!');
    setAttempts(0);
    setDone(false);
    setRange({ min: 1, max: 100 });
  };

  const guess = () => {
    const num = parseInt(input, 10);
    if (Number.isNaN(num) || num < 1 || num > 100) return;
    setInput('');
    const na = attempts + 1;
    setAttempts(na);
    if (num === answer) {
      setHint(`🎉 정답! ${answer}!`);
      setDone(true);
      onResult?.(`🔢 업다운 ${na}번 만에 정답! (${answer})`);
    } else if (num < answer) {
      setHint(`⬆️ UP! ${num}보다 큽니다`);
      setRange((r) => ({ ...r, min: Math.max(r.min, num + 1) }));
    } else {
      setHint(`⬇️ DOWN! ${num}보다 작습니다`);
      setRange((r) => ({ ...r, max: Math.min(r.max, num - 1) }));
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🔢 업다운 게임</h3>
      <p className="text-gray-400 text-sm">범위: {range.min} ~ {range.max}</p>
      <p className={`text-lg font-bold ${done ? 'text-green-400' : hint.includes('UP') ? 'text-red-400' : hint.includes('DOWN') ? 'text-blue-400' : 'text-white'}`}>
        {hint}
      </p>
      {!done ? (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && guess()}
            type="number"
            min={1}
            max={100}
            className="w-24 p-2 rounded-lg bg-gray-700 text-white text-center text-lg outline-none"
            placeholder="?"
          />
          <button onClick={guess} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 transition">확인</button>
        </div>
      ) : (
        <button onClick={reset} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition">다시하기</button>
      )}
      <p className="text-gray-500 text-xs">시도: {attempts}회</p>
    </div>
  );
}
