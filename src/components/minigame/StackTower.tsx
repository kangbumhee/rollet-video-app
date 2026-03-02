'use client';
import { useState, useEffect, useRef } from 'react';

interface Props { onResult?: (msg: string) => void; }
interface Block { left: number; width: number; }

export default function StackTower({ onResult }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [moving, setMoving] = useState({ left: 0, width: 80, dir: 1 });
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const animRef = useRef<number | null>(null);
  const movingRef = useRef(moving);
  const containerWidth = 200;

  useEffect(() => { movingRef.current = moving; }, [moving]);

  const startAnimation = () => {
    const speed = 2;
    const animate = () => {
      setMoving((prev) => {
        let nl = prev.left + speed * prev.dir;
        let nd = prev.dir;
        if (nl + prev.width > containerWidth) { nl = containerWidth - prev.width; nd = -1; }
        if (nl < 0) { nl = 0; nd = 1; }
        return { ...prev, left: nl, dir: nd };
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
  };

  const startGame = () => {
    setBlocks([{ left: 60, width: 80 }]);
    setMoving({ left: 0, width: 80, dir: 1 });
    setScore(0);
    setGameOver(false);
    setPlaying(true);
    startAnimation();
  };

  const drop = () => {
    if (!playing || gameOver) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const cur = movingRef.current;
    const prev = blocks[blocks.length - 1];
    const overlapStart = Math.max(cur.left, prev.left);
    const overlapEnd = Math.min(cur.left + cur.width, prev.left + prev.width);
    const overlapWidth = overlapEnd - overlapStart;

    if (overlapWidth <= 0) {
      setGameOver(true); setPlaying(false);
      const nb = Math.max(best, score);
      setBest(nb);
      onResult?.(`🏗️ 탑 쌓기 ${score}층! (최고: ${nb}층)`);
      return;
    }

    const newBlock: Block = { left: overlapStart, width: Math.round(overlapWidth) };
    const ns = score + 1;
    setBlocks((b) => [...b, newBlock]);
    setScore(ns);

    if (overlapWidth < 5) {
      setGameOver(true); setPlaying(false);
      const nb = Math.max(best, ns);
      setBest(nb);
      onResult?.(`🏗️ 탑 쌓기 ${ns}층! (최고: ${nb}층)`);
      return;
    }

    setMoving({ left: 0, width: Math.round(overlapWidth), dir: 1 });
    startAnimation();
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-gray-800 rounded-xl">
      <h3 className="text-white font-bold text-lg">🏗️ 탑 쌓기</h3>
      <p className="text-yellow-400 font-bold">{score}층</p>
      <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ width: containerWidth, height: 250 }}>
        {blocks.slice(-8).map((b, i) => (
          <div key={i} className="absolute bg-gradient-to-r from-blue-500 to-purple-500 rounded-sm" style={{ left: b.left, width: b.width, height: 20, bottom: i * 22 }} />
        ))}
        {playing && !gameOver && (
          <div className="absolute bg-gradient-to-r from-green-400 to-cyan-400 rounded-sm" style={{ left: moving.left, width: moving.width, height: 20, bottom: blocks.slice(-8).length * 22 }} />
        )}
      </div>
      {playing && !gameOver ? (
        <button onClick={drop} className="w-full py-3 bg-cyan-600 text-white rounded-lg font-bold text-lg hover:bg-cyan-500 transition active:scale-95">
          놓기!
        </button>
      ) : (
        <div className="text-center">
          {gameOver && <p className="text-red-400 font-bold mb-2">게임 오버! {score}층</p>}
          <button onClick={startGame} className="px-8 py-3 bg-cyan-600 text-white rounded-lg font-bold hover:bg-cyan-500 transition">
            {gameOver ? '다시하기' : '시작하기'}
          </button>
          {best > 0 && <p className="text-yellow-400 text-sm mt-2">최고: {best}층</p>}
        </div>
      )}
    </div>
  );
}
