'use client';
import { useState } from 'react';

interface Props { onResult?: (msg: string) => void; }

function generateAnswer(): number[] {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const result: number[] = [];
  while (result.length < 3) {
    const idx = Math.floor(Math.random() * digits.length);
    const d = digits.splice(idx, 1)[0];
    if (result.length === 0 && d === 0) { digits.push(d); continue; }
    result.push(d);
  }
  return result;
}

function judge(answer: number[], guess: number[]): { s: number; b: number } {
  let s = 0, b = 0;
  for (let i = 0; i < 3; i++) {
    if (guess[i] === answer[i]) s++;
    else if (answer.includes(guess[i])) b++;
  }
  return { s, b };
}

export default function NumberBaseball({ onResult }: Props) {
  const [answer, setAnswer] = useState(generateAnswer);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ guess: string; s: number; b: number }[]>([]);
  const [done, setDone] = useState(false);

  const reset = () => {
    setAnswer(generateAnswer());
    setInput('');
    setHistory([]);
    setDone(false);
  };

  const submit = () => {
    if (done) return;
    const digits = input.split('').map(Number);
    if (digits.length !== 3 || new Set(digits).size !== 3 || Number.isNaN(digits[0])) return;
    const { s, b } = judge(answer, digits);
    const nh = [...history, { guess: input, s, b }];
    setHistory(nh);
    setInput('');
    if (s === 3) {
      setDone(true);
      onResult?.(`⚾ 숫자야구 ${nh.length}번 만에 정답! (${answer.join('')})`);
    } else if (nh.length >= 10) {
      setDone(true);
      onResult?.(`⚾ 숫자야구 10번 안에 못 맞춤... 정답: ${answer.join('')}`);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg text-center">⚾ 숫자 야구</h3>
      <p className="text-gray-400 text-sm text-center">서로 다른 3자리 숫자를 맞춰보세요</p>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {history.map((h, i) => (
          <div key={i} className="flex justify-between bg-gray-700 px-3 py-1.5 rounded text-sm">
            <span className="text-white">{i + 1}. {h.guess}</span>
            <span className="text-yellow-400">{h.s}S {h.b}B{h.s === 0 && h.b === 0 ? ' OUT' : ''}</span>
          </div>
        ))}
      </div>
      {!done ? (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="flex-1 p-2 rounded-lg bg-gray-700 text-white text-center text-lg outline-none"
            placeholder="3자리 입력"
            maxLength={3}
          />
          <button onClick={submit} className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-500 transition">확인</button>
        </div>
      ) : (
        <div className="text-center">
          <p className={`font-bold text-lg ${history[history.length - 1]?.s === 3 ? 'text-green-400' : 'text-red-400'}`}>
            {history[history.length - 1]?.s === 3 ? `🎉 ${history.length}번 만에 정답!` : `💀 실패! 정답: ${answer.join('')}`}
          </p>
          <button onClick={reset} className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition">다시하기</button>
        </div>
      )}
    </div>
  );
}
