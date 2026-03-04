'use client';

import MiniGameLauncher from '@/components/minigame/MiniGameLauncher';

interface Props {
  roomId: string;
}

export default function FreePlayLobby({ roomId }: Props) {
  void roomId;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-white/30 text-sm text-center">
        경품 추첨이 끝났지만 게임은 계속! 참여하고 싶은 미니게임을 선택하세요.
      </p>
      <MiniGameLauncher />
    </div>
  );
}
