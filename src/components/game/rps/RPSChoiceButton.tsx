// src/components/game/rps/RPSChoiceButton.tsx
"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { RPSChoice } from "@/types/game";
import { soundManager } from "@/lib/sounds/SoundManager";

const CHOICE_MAP: Record<RPSChoice, { emoji: string; label: string; color: string }> = {
  rock: { emoji: "✊", label: "바위", color: "from-red-500 to-red-700" },
  scissors: { emoji: "✌️", label: "가위", color: "from-blue-500 to-blue-700" },
  paper: { emoji: "🖐️", label: "보", color: "from-green-500 to-green-700" },
};

interface RPSChoiceButtonProps {
  choice: RPSChoice;
  onClick: () => void;
  disabled: boolean;
  isSelected: boolean;
}

export function RPSChoiceButton({ choice, onClick, disabled, isSelected }: RPSChoiceButtonProps) {
  const info = CHOICE_MAP[choice];

  const handleClick = () => {
    soundManager.play("rps-select");
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center w-24 h-28 rounded-2xl transition-all duration-200",
        "bg-gradient-to-b shadow-lg",
        info.color,
        "hover:scale-110 hover:shadow-xl active:scale-95",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        isSelected && "ring-4 ring-yellow-400 scale-110"
      )}
    >
      <span className="text-4xl mb-1">{info.emoji}</span>
      <span className="text-sm font-bold text-white">{info.label}</span>
    </button>
  );
}
