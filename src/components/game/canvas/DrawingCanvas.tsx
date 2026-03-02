'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Point { x: number; y: number }
interface Stroke { points: Point[]; color: string; width: number }

interface DrawingCanvasProps {
  width?: number;
  height?: number;
  disabled?: boolean;
  brushColor?: string;
  brushWidth?: number;
  strokes?: Stroke[];
  onStroke?: (stroke: Stroke) => void;
  onClear?: () => void;
  showToolbar?: boolean;
}

const COLORS = ['#FFFFFF', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#0099FF', '#9900FF', '#FF00FF', '#000000'];
const WIDTHS = [2, 4, 8, 14];

export default function DrawingCanvas({
  width = 350,
  height = 300,
  disabled = false,
  brushColor: initialColor = '#FFFFFF',
  brushWidth: initialWidth = 4,
  strokes = [],
  onStroke,
  onClear,
  showToolbar = true,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [color, setColor] = useState(initialColor);
  const [lineWidth, setLineWidth] = useState(initialWidth);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    if (currentPoints.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, currentPoints, color, lineWidth]);

  useEffect(() => { redraw(); }, [redraw]);

  const getPos = (e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    setCurrentPoints([pos]);
  };

  const moveDraw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentPoints((prev) => [...prev, pos]);
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length >= 2 && onStroke) {
      onStroke({ points: currentPoints, color, width: lineWidth });
    }
    setCurrentPoints([]);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-xl border-2 border-gray-700 touch-none"
        style={{ width: '100%', maxWidth: width, aspectRatio: `${width}/${height}` }}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />
      {showToolbar && !disabled && (
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-yellow-400 scale-125' : 'border-gray-600'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-px h-6 bg-gray-700 mx-1" />
          {WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition ${lineWidth === w ? 'border-yellow-400 bg-gray-700' : 'border-gray-600'}`}
            >
              <div className="rounded-full bg-white" style={{ width: w, height: w }} />
            </button>
          ))}
          <button
            onClick={onClear}
            className="px-3 py-1 text-xs bg-red-600/30 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-600/50"
          >
            지우기
          </button>
        </div>
      )}
    </div>
  );
}
