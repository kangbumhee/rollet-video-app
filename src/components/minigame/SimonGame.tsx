'use client';
import { useState, useRef } from 'react';

interface Props { onResult?: (msg: string) => void; }

const PADS = [
  { id: 0, color: 'bg-red-600', active: 'bg-red-400', label: '🔴' },
  { id: 1, color: 'bg-blue-600', active: 'bg-blue-400', label: '🔵' },
  { id: 2, color: 'bg-green-600', active: 'bg-green-400', label: '🟢' },
  { id: 3, color: 'bg-yellow-500', active: 'bg-yellow-300', label: '🟡' },
];

export default function SimonGame({ onResult }: Props) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'showing' | 'input' | 'gameover'>('idle');
  const [level, setLevel] = useState(0);
  const [best, setBest] = useState(0);
  const showingRef = useRef(false);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const showSequence = async (seq: number[]) => {
    showingRef.current = true;
    setPhase('showing');
    await delay(500);
    for (const idx of seq) {
      setActiveIdx(idx);
      await delay(500);
      setActiveIdx(null);
      await delay(200);
    }
    showingRef.current = false;
    setPhase('input');
    setPlayerInput([]);
  };

  const start = () => {
    const first = [Math.floor(Math.random() * 4)];
    setSequence(first);
    setLevel(1);
    void showSequence(first);
  };

  const handlePad = (id: number) => {
    if (phase !== 'input') return;
    const ni = [...playerInput, id];
    setPlayerInput(ni);
    setActiveIdx(id);
    setTimeout(() => setActiveIdx(null), 150);

    const idx = ni.length - 1;
    if (ni[idx] !== sequence[idx]) {
      setPhase('gameover');
      const nb = Math.max(best, level - 1);
      setBest(nb);
      onResult?.(`🔴 사이먼 게임 레벨 ${level}에서 탈락! (최고: ${nb})`);
      return;
    }
    if (ni.length === sequence.length) {
      const ns = [...sequence, Math.floor(Math.random() * 4)];
      setSequence(ns);
      setLevel((l) => l + 1);
      setTimeout(() => {
        void showSequence(ns);
      }, 800);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🔴 사이먼 게임</h3>
      <p className="text-yellow-400 font-bold">레벨: {level}</p>
      <div className="grid grid-cols-2 gap-3">
        {PADS.map((pad) => (
          <button
            key={pad.id}
            onClick={() => handlePad(pad.id)}
            disabled={phase !== 'input'}
            className={`w-24 h-24 rounded-2xl text-3xl transition-all duration-150 ${
              activeIdx === pad.id ? `${pad.active} scale-110` : pad.color
            } ${phase === 'input' ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
          >
            {pad.label}
          </button>
        ))}
      </div>
      {phase === 'showing' && <p className="text-white animate-pulse">순서를 기억하세요...</p>}
      {phase === 'input' && <p className="text-green-400">따라서 눌러주세요! ({playerInput.length}/{sequence.length})</p>}
      {(phase === 'idle' || phase === 'gameover') && (
        <div className="text-center">
          {phase === 'gameover' && <p className="text-red-400 font-bold mb-2">틀렸습니다! 레벨 {level}</p>}
          <button onClick={start} className="px-8 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-500 transition">
            {phase === 'gameover' ? '다시하기' : '시작하기'}
          </button>
          {best > 0 && <p className="text-yellow-400 text-sm mt-2">최고: 레벨 {best}</p>}
        </div>
      )}
    </div>
  );
}
