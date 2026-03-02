'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { OnlineUser, usePresence } from '@/hooks/usePresence';
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
import MiniGameLauncher from '@/components/minigame/MiniGameLauncher';
import FreePlayLobby from '@/components/game/FreePlayLobby';
import { Badge } from '@/components/ui/badge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import Image from 'next/image';

export default function RoomPage() {
  useWakeLock();
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { user, profile, loading } = useAuthStore();

  const { onlineCount, onlineUsers } = usePresence(roomId, user?.uid || null);
  const { messages, sendMessage } = useChat(roomId, {
    uid: user?.uid || '',
    displayName: profile?.displayName || '익명',
    photoURL: profile?.photoURL,
    level: profile?.level || 1,
    isModerator: profile?.isModerator || false,
    isAdmin: profile?.isAdmin || false,
  });
  const { cycle, isLive } = useCycle(roomId);
  useGameSounds(cycle?.currentPhase);
  const cyclePhase = cycle?.currentPhase;

  const [hasTicket, setHasTicket] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [showFreePlay, setShowFreePlay] = useState(false);
  const canSeeUserList = profile?.isAdmin || profile?.isModerator || false;

  const handleKick = useCallback(async (targetUid: string, targetDisplayName: string) => {
    if (!user) return;
    const confirmed = window.confirm(`${targetDisplayName}님을 강퇴하시겠습니까?\n(30분간 참여 제한)`);
    if (!confirmed) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/moderate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'kick',
          targetUid,
          targetDisplayName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert(data.error || '강퇴 실패');
      }
    } catch {
      alert('네트워크 오류');
    }
  }, [user]);

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
        <div className="flex flex-col items-center justify-center p-4 w-full">
          <CycleStatus
            phase={cyclePhase}
            nextSlotTime={cycle?.nextSlot}
            prizeTitle={cycle?.currentPrizeTitle}
            prizeImageURL={cycle?.currentPrizeImage}
          />
          <MiniGameLauncher />
        </div>
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
        <main className="flex-[3] flex flex-col items-center justify-center overflow-hidden px-4">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">🎉 우승자 발표!</h2>
          <p className="text-gray-400 mb-6">
            {cycle.currentGameType === 'rps' ? '가위바위보 토너먼트' : '게임'} 최종 우승
          </p>

          <div className="flex flex-col items-center gap-3 mb-6">
            {cycle.winnerPhoto ? (
              <img src={cycle.winnerPhoto} alt="" className="w-20 h-20 rounded-full border-4 border-yellow-500 object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 border-4 border-yellow-500 flex items-center justify-center text-3xl font-bold text-yellow-400">
                {(cycle.winnerName || '?')[0]}
              </div>
            )}
            <p className="text-white text-xl font-bold">{cycle.winnerName || '우승자'}</p>
          </div>

          {cycle.currentPrizeTitle && (
            <div className="bg-gray-800/80 rounded-2xl p-4 flex items-center gap-4 mb-6 max-w-sm w-full">
              {cycle.currentPrizeImage && (
                <img src={cycle.currentPrizeImage} alt="" className="w-16 h-16 rounded-xl object-cover" />
              )}
              <div>
                <p className="text-purple-400 text-xs">획득 경품</p>
                <p className="text-white font-bold">{cycle.currentPrizeTitle}</p>
              </div>
            </div>
          )}

          {user?.uid === cycle.winnerId ? (
            <div className="bg-green-900/40 border border-green-500/50 rounded-2xl p-5 max-w-sm w-full text-center">
              <p className="text-green-400 font-bold text-lg mb-2">🎁 축하합니다!</p>
              <p className="text-gray-300 text-sm mb-3">경품 수령을 위해 아래 정보를 확인해 주세요.</p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>📧 등록된 이메일로 수령 안내가 발송됩니다</p>
                <p>📦 영업일 기준 3~5일 내 배송 예정</p>
                <p>📞 문의: 마이페이지 → 당첨 내역</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-4 max-w-sm w-full text-center">
              <p className="text-gray-400 text-sm">다음 경품에 도전해 보세요! 💪</p>
            </div>
          )}

          <div className="flex flex-col items-center gap-3 mt-4">
            <button
              onClick={() => setShowFreePlay(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg animate-pulse"
            >
              🎮 다른 게임 더 하기!
            </button>
          </div>
        </main>
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
      <header className="shrink-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 z-50 relative">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">
              ←
            </button>
            {isLive && <LiveBadge />}
            <h1 className="text-white font-bold text-sm">PrizeLive</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {canSeeUserList ? (
              <button onClick={() => setShowUserList(!showUserList)} className="relative">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 cursor-pointer hover:border-yellow-500/50 transition-colors">
                  👥 {onlineCount}
                </Badge>
              </button>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                👥 {onlineCount}
              </Badge>
            )}
            <SoundToggle />
            {hasTicket && <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0.5">🎫</Badge>}
            {profile && <LevelBadge level={profile.level} size="sm" />}
          </div>
        </div>
      </header>

      {/* 참가자 목록 패널 */}
      {showUserList && canSeeUserList && (
        <div className="absolute top-12 right-2 z-[100] w-64 max-h-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-xs font-bold text-white">접속자 목록 ({onlineCount}명)</span>
            <button onClick={() => setShowUserList(false)} className="text-gray-500 hover:text-white text-sm">
              ✕
            </button>
          </div>
          <div className="overflow-y-auto max-h-64 p-2 space-y-1">
            {onlineUsers.map((u: OnlineUser) => (
              <div
                key={u.uid}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="text-xs text-gray-300 truncate max-w-[120px]">{u.displayName}</span>
                  <span className="text-[9px] text-gray-600">Lv.{u.level}</span>
                </div>
                {profile?.isAdmin && u.uid !== profile.uid && (
                  <button
                    onClick={() => void handleKick(u.uid, u.displayName)}
                    className="text-[9px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                  >
                    강퇴
                  </button>
                )}
              </div>
            ))}
            {onlineUsers.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-4">접속자가 없습니다</p>
            )}
          </div>
        </div>
      )}

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
          <ChatWindow
            messages={messages}
            onSendMessage={(msg) => void sendMessage(msg)}
            currentUid={user?.uid || ''}
            onKick={handleKick}
          />
        </aside>
      </div>

      {showFreePlay && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-gray-900 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-white font-bold text-lg">🎮 자유 게임</h2>
              <button onClick={() => setShowFreePlay(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <FreePlayLobby roomId={roomId} />
          </div>
        </div>
      )}
    </div>
  );
}
