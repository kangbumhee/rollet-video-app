'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { usePresence } from '@/hooks/usePresence';
import { useChat } from '@/hooks/useChat';
import { useCycle } from '@/hooks/useCycle';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useWakeLock } from '@/hooks/useWakeLock';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { LiveBadge } from '@/components/room/LiveBadge';
import { LevelBadge } from '@/components/user/LevelBadge';
import CycleStatus from '@/components/cycle/CycleStatus';
import { GameContainer } from '@/components/game/GameContainer';
import { AdGate } from '@/components/ad/AdGate';
import { ForcedVideoPlayer } from '@/components/video/ForcedVideoPlayer';
import { Badge } from '@/components/ui/badge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import Image from 'next/image';

export default function RoomPage() {
  useWakeLock();
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { user, profile, loading } = useAuthStore();

  const { onlineCount } = usePresence(roomId, user?.uid || null);
  const { messages, sendMessage } = useChat(roomId, {
    uid: user?.uid || '',
    displayName: profile?.displayName || '익명',
    photoURL: profile?.photoURL,
    level: profile?.level || 1,
  });
  const { cycle, isLive } = useCycle(roomId);
  useGameSounds(cycle?.currentPhase);
  const cyclePhase = cycle?.currentPhase;

  const [hasTicket, setHasTicket] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-prize-500" />
      </div>
    );
  }

  const renderMainContent = () => {
    if (!cycle || cycle.currentPhase === 'IDLE' || cycle.currentPhase === 'COOLDOWN') {
      return (
        <CycleStatus
          phase={cyclePhase}
          nextSlotTime={cycle?.nextSlot}
          prizeTitle={cycle?.currentPrizeTitle}
          prizeImageURL={cycle?.currentPrizeImage}
        />
      );
    }

    if (cycle.currentPhase === 'ANNOUNCING') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <CycleStatus
            phase={cyclePhase}
            nextSlotTime={cycle?.nextSlot}
            prizeTitle={cycle?.currentPrizeTitle}
            prizeImageURL={cycle?.currentPrizeImage}
          />
          <div className="text-center space-y-3">
            {cycle.currentPrizeImage && (
              <Image src={cycle.currentPrizeImage} alt="" width={192} height={192} className="w-48 h-48 rounded-2xl object-cover mx-auto shadow-2xl" />
            )}
            <h2 className="text-2xl font-bold text-white">{cycle.currentPrizeTitle}</h2>
            <p className="text-sm text-gray-400">곧 입장 게이트가 열립니다!</p>
          </div>
        </div>
      );
    }

    if (cycle.currentPhase === 'ENTRY_GATE' && !hasTicket) {
      return (
        <div className="flex-1 flex flex-col p-4">
          <CycleStatus
            phase={cyclePhase}
            nextSlotTime={cycle?.nextSlot}
            prizeTitle={cycle?.currentPrizeTitle}
            prizeImageURL={cycle?.currentPrizeImage}
          />
          <div className="flex-1 flex items-center justify-center">
            {cycle.entryType === 'VIDEO' && cycle.videoURL ? (
              <ForcedVideoPlayer videoURL={cycle.videoURL} roomId={roomId} onComplete={() => setHasTicket(true)} />
            ) : (
              <AdGate roomId={roomId} onComplete={() => setHasTicket(true)} />
            )}
          </div>
        </div>
      );
    }

    if (
      cycle.currentPhase === 'GAME_LOBBY' ||
      cycle.currentPhase === 'GAME_COUNTDOWN' ||
      cycle.currentPhase === 'GAME_PLAYING' ||
      cycle.currentPhase === 'GAME_RESULT' ||
      (cycle.currentPhase === 'ENTRY_GATE' && hasTicket)
    ) {
      return (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2">
            <CycleStatus
              phase={cyclePhase}
              nextSlotTime={cycle?.nextSlot}
              prizeTitle={cycle?.currentPrizeTitle}
              prizeImageURL={cycle?.currentPrizeImage}
            />
          </div>
          <div className="flex-1 p-4">
            <GameContainer
              roomId={roomId}
              uid={user?.uid || null}
              displayName={profile?.displayName || '익명'}
              photoURL={profile?.photoURL}
              level={profile?.level || 1}
            />
          </div>
        </div>
      );
    }

    if (cycle.currentPhase === 'WINNER_ANNOUNCE') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <CycleStatus
            phase={cyclePhase}
            nextSlotTime={cycle?.nextSlot}
            prizeTitle={cycle?.currentPrizeTitle}
            prizeImageURL={cycle?.currentPrizeImage}
          />
          <div className="text-center space-y-3">
            <span className="text-7xl animate-bounce">🏆</span>
            {cycle.winnerName ? (
              <>
                <h2 className="text-2xl font-bold text-white">🎉 축하합니다!</h2>
                <p className="text-xl text-yellow-400 font-bold">{cycle.winnerName}님</p>
                <p className="text-sm text-gray-400">&ldquo;{cycle.currentPrizeTitle}&rdquo;의 주인공입니다!</p>
              </>
            ) : (
              <p className="text-lg text-gray-400">우승자를 발표하고 있습니다...</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <CycleStatus
        phase={cyclePhase}
        nextSlotTime={cycle?.nextSlot}
        prizeTitle={cycle?.currentPrizeTitle}
        prizeImageURL={cycle?.currentPrizeImage}
      />
    );
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gray-950 overflow-hidden">
      {/* 헤더 */}
      <header className="shrink-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-50">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">
              ←
            </button>
            {isLive && <LiveBadge />}
            <h1 className="text-white font-bold text-sm">PrizeLive</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
              👥 {onlineCount}
            </Badge>
            <SoundToggle />
            {hasTicket && <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0.5">🎫</Badge>}
            {profile && <LevelBadge level={profile.level} size="sm" />}
          </div>
        </div>
      </header>

      {/* PC: 가로 배치, 모바일: 세로 배치 */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* 메인 콘텐츠 */}
        <main
          className={
            !cyclePhase || cyclePhase === 'IDLE' || cyclePhase === 'COOLDOWN'
              ? 'flex-[3] lg:flex-1 flex items-center justify-center overflow-hidden min-h-0'
              : 'flex-[3] lg:flex-1 overflow-y-auto min-h-0'
          }
        >
          {renderMainContent()}
        </main>

        {/* 채팅 */}
        <aside className="flex-[2] lg:flex-none lg:w-80 min-h-0 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-800">
          <ChatWindow messages={messages} onSendMessage={(msg) => void sendMessage(msg)} currentUid={user?.uid || ''} />
        </aside>
      </div>
    </div>
  );
}
