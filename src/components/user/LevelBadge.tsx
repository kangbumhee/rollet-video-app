// ============================================
// 파일: src/components/user/LevelBadge.tsx
// 설명: 레벨 뱃지 (채팅·프로필에서 사용)
// ============================================

"use client";

import { cn } from "@/lib/utils";

// 간단 레벨별 색상 매핑 (전체 레벨 테이블은 lib/utils/level.ts)
function getLevelStyle(level: number): { color: string; bg: string } {
  if (level >= 50) return { color: "text-amber-300", bg: "bg-amber-500/20" };
  if (level >= 40) return { color: "text-blue-400", bg: "bg-blue-500/20" };
  if (level >= 30) return { color: "text-red-400", bg: "bg-red-500/20" };
  if (level >= 20) return { color: "text-purple-400", bg: "bg-purple-500/20" };
  if (level >= 10) return { color: "text-yellow-400", bg: "bg-yellow-500/20" };
  if (level >= 5) return { color: "text-green-400", bg: "bg-green-500/20" };
  return { color: "text-gray-400", bg: "bg-gray-500/20" };
}

interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LevelBadge({ level, size = "md", className }: LevelBadgeProps) {
  const style = getLevelStyle(level);

  const sizeClasses = {
    sm: "text-[9px] px-1.5 py-0",
    md: "text-[11px] px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold rounded-full",
        style.color,
        style.bg,
        sizeClasses[size],
        className
      )}
    >
      Lv.{level}
    </span>
  );
}

export default LevelBadge;
