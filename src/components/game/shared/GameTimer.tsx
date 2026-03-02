// src/components/game/shared/GameTimer.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GameTimerProps {
  remaining: number; // 남은 초
  total: number; // 전체 초
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function GameTimer({ remaining, total, size = "md", showLabel = true }: GameTimerProps) {
  const percentage = total > 0 ? (remaining / total) * 100 : 0;
  const isUrgent = remaining <= 2;

  const sizes = {
    sm: { ring: "w-12 h-12", text: "text-lg", stroke: 4 },
    md: { ring: "w-20 h-20", text: "text-2xl", stroke: 6 },
    lg: { ring: "w-28 h-28", text: "text-4xl", stroke: 8 },
  };

  const s = sizes[size];
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className={cn("relative", s.ring)}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth={s.stroke} fill="none" className="text-gray-700" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth={s.stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={cn("transition-all duration-200", isUrgent ? "text-red-500" : "text-yellow-500")}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(s.text, "font-bold", isUrgent ? "text-red-500 animate-pulse" : "text-white")}>{remaining}</span>
        </div>
      </div>
      {showLabel && <span className="text-xs text-gray-500 mt-1">남은 시간</span>}
    </div>
  );
}
