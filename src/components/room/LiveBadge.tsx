// ============================================
// 파일: src/components/room/LiveBadge.tsx
// 설명: LIVE 뱃지 (빨간 점 + 깜빡임)
// ============================================

export function LiveBadge() {
  return (
    <div
      className="flex items-center gap-1.5 bg-red-600/20 border border-red-500/30
                    px-2.5 py-1 rounded-full"
    >
      <span className="w-2 h-2 bg-red-500 rounded-full live-badge" />
      <span className="text-[11px] font-bold text-red-400 tracking-wider">LIVE</span>
    </div>
  );
}

export default LiveBadge;
