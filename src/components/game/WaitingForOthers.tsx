'use client';

interface Props {
  progress: { total: number; done: number; online: number; onlineDone: number };
  myRoundScore: number;
}

export default function WaitingForOthers({ progress, myRoundScore }: Props) {
  const pct = progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <div className="text-5xl animate-bounce">✅</div>
      <p className="text-white font-bold text-lg">제출 완료!</p>
      <p className="text-white/40 text-sm text-center">
        이번 라운드 <span className="text-white font-bold font-score">+{myRoundScore}점</span>
      </p>
      <div className="w-56 space-y-2">
        <div className="h-2.5 bg-surface-base rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-neon-magenta to-neon-cyan rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-center text-xs text-white/30">
          {progress.done}/{progress.total}명 완료 — 전원 완료 시 자동 진행
        </p>
      </div>
      {progress.online > 0 && progress.online < progress.total && (
        <p className="text-[10px] text-white/15">
          (현재 접속 {progress.online}명 / 전체 {progress.total}명)
        </p>
      )}
    </div>
  );
}
