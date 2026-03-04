// ============================================
// 파일: src/components/room/LiveBadge.tsx
// 설명: LIVE 뱃지 (네온 아케이드 디자인)
// ============================================

interface LiveBadgeProps {
  className?: string;
}

export function LiveBadge({ className }: LiveBadgeProps) {
  return (
    <div
      className={`flex items-center gap-1 bg-red-500/15 border border-red-500/25 px-1.5 py-0.5 rounded-full shrink-0 ${className ?? ""}`}
    >
      <span className="w-1.5 h-1.5 bg-red-500 rounded-full live-badge" />
      <span className="text-[10px] font-bold text-red-400 tracking-wider">
        LIVE
      </span>
    </div>
  );
}

export default LiveBadge;
