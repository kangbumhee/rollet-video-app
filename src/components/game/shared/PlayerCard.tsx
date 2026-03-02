// src/components/game/shared/PlayerCard.tsx
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  displayName: string;
  photoURL: string | null;
  level: number;
  alive: boolean;
  isMe?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PlayerCard({ displayName, photoURL, level, alive, isMe = false, size = "md" }: PlayerCardProps) {
  const sizes = {
    sm: { avatar: "w-8 h-8", text: "text-xs", badge: "text-[10px]" },
    md: { avatar: "w-12 h-12", text: "text-sm", badge: "text-xs" },
    lg: { avatar: "w-16 h-16", text: "text-base", badge: "text-sm" },
  };

  const s = sizes[size];

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg transition-all",
        alive ? "bg-gray-800/50" : "bg-gray-900/30 opacity-40",
        isMe && "ring-1 ring-yellow-500"
      )}
    >
      <div className={cn(s.avatar, "rounded-full bg-gray-700 overflow-hidden flex-shrink-0", !alive && "grayscale")}>
        {photoURL ? (
          <img src={photoURL} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">{displayName[0]}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(s.text, "text-white truncate", !alive && "line-through")}>{displayName}</p>
        <Badge variant="outline" className={cn(s.badge, "mt-0.5")}>
          Lv.{level}
        </Badge>
      </div>
      {isMe && <span className="text-xs text-yellow-400">나</span>}
      {!alive && <span className="text-xs text-red-400">탈락</span>}
    </div>
  );
}
