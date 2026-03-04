'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, push, off } from 'firebase/database';
import { realtimeDb } from '@/lib/firebase/config';

interface Props {
  roundData: Record<string, unknown>;
  round: number;
  myUid: string;
  timeLeft: number;
  onSubmit: (score: number, extra?: Record<string, unknown>) => Promise<void>;
  scores: Record<string, number>;
  nameMap: Record<string, string>;
  roomId?: string;
}

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
}

export default function DrawGuessGame({ roundData, round, myUid, timeLeft, onSubmit, roomId = 'main' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [guess, setGuess] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [penColor, setPenColor] = useState('#ffffff');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [wrongGuess, setWrongGuess] = useState(false);

  const word = (roundData?.word as string) || '';
  const drawerId = (roundData?.drawerId as string) || '';
  const isDrawer = drawerId === myUid;
  const CANVAS_SIZE = 300;

  useEffect(() => {
    setGuess('');
    setSubmitted(false);
    setStrokes([]);
    setCurrentStroke([]);
    setIsDrawing(false);
    setWrongGuess(false);
  }, [round]);

  const pushStroke = useCallback((stroke: Stroke) => {
    if (!isDrawer) return;
    const drawRef = ref(realtimeDb, `games/${roomId}/drawing/round${round}`);
    push(drawRef, stroke);
  }, [isDrawer, round, roomId]);

  useEffect(() => {
    if (isDrawer) return;
    const drawRef = ref(realtimeDb, `games/${roomId}/drawing/round${round}`);
    onValue(drawRef, (snap) => {
      if (!snap.exists()) { setStrokes([]); return; }
      const data = snap.val();
      const strokeList: Stroke[] = Object.values(data || {});
      setStrokes(strokeList);
    });
    return () => off(drawRef);
  }, [isDrawer, round, roomId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0A0A12';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const allStrokes = isDrawer ? [...strokes, { points: currentStroke, color: penColor }] : strokes;

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || '#ffffff';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, currentStroke, penColor, isDrawer]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = CANVAS_SIZE / rect.width;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scale,
        y: (e.touches[0].clientY - rect.top) * scale,
      };
    }
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer || submitted) return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    setCurrentStroke([pos]);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawer) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentStroke((prev) => [...prev, pos]);
  };

  const handlePointerUp = () => {
    if (!isDrawing || !isDrawer) return;
    setIsDrawing(false);
    if (currentStroke.length >= 2) {
      const stroke: Stroke = { points: currentStroke, color: penColor };
      setStrokes((prev) => [...prev, stroke]);
      pushStroke(stroke);
    }
    setCurrentStroke([]);
  };

  const handleGuess = () => {
    if (submitted || !guess.trim() || isDrawer) return;
    if (guess.trim().toLowerCase() === word.toLowerCase()) {
      setSubmitted(true);
      const score = Math.max(10, timeLeft * 10);
      onSubmit(score, { guessedWord: guess.trim() });
    } else {
      setWrongGuess(true);
      setTimeout(() => setWrongGuess(false), 500);
      setGuess('');
    }
  };

  useEffect(() => {
    if (isDrawer && timeLeft <= 0 && !submitted) {
      setSubmitted(true);
      onSubmit(0);
    }
  }, [isDrawer, timeLeft, submitted, onSubmit]);

  const COLORS = ['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];

  return (
    <div className="max-w-sm mx-auto space-y-4">
      {isDrawer ? (
        <>
          <div className="text-center">
            <p className="text-white/30 text-xs">그릴 단어</p>
            <p className="text-neon-amber font-bold text-xl">{word}</p>
          </div>
          <div className="flex justify-center gap-2 mb-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setPenColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${penColor === c ? 'border-neon-cyan scale-110' : 'border-white/10'}`}
                style={{ backgroundColor: c }} />
            ))}
            <button onClick={() => { setStrokes([]); }}
              className="px-3 py-1 text-xs bg-surface-elevated border border-white/[0.06] text-white/40 rounded-lg">
              지우기
            </button>
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="text-white/30 text-xs">힌트: {(roundData?.category as string) || '???'}</p>
          <p className="text-white/40 text-sm">{word.replace(/./g, '_ ')} ({word.length}글자)</p>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="w-full max-w-[300px] mx-auto aspect-square rounded-xl border border-white/[0.06] bg-[#0A0A12] touch-none"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />

      {!isDrawer && !submitted && (
        <div className="flex gap-2">
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="정답 입력..."
            className={`flex-1 px-4 py-3 rounded-xl bg-surface-base text-white border transition-all outline-none ${
              wrongGuess ? 'border-red-500 animate-shake' : 'border-white/[0.06] focus:border-neon-cyan/40'
            }`}
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
          />
          <button onClick={handleGuess}
            className="px-5 py-3 rounded-xl bg-neon-cyan/15 border border-neon-cyan/25 text-neon-cyan font-bold hover:bg-neon-cyan/25 active:scale-95 transition-all">
            확인
          </button>
        </div>
      )}
      {submitted && !isDrawer && (
        <p className="text-center text-neon-cyan font-bold">정답! 🎉</p>
      )}
    </div>
  );
}
