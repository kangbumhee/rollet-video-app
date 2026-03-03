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
import RegularGamePlayer from '@/components/game/RegularGamePlayer';
import { AdGate } from '@/components/ad/AdGate';
import { ForcedVideoPlayer } from '@/components/video/ForcedVideoPlayer';
import MiniGameLauncher from '@/components/minigame/MiniGameLauncher';
import FreePlayLobby from '@/components/game/FreePlayLobby';
import { Badge } from '@/components/ui/badge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { onValue, ref, set } from 'firebase/database';
import { doc, onSnapshot } from 'firebase/firestore';
import { realtimeDb, firestore } from '@/lib/firebase/config';
import Image from 'next/image';
import { PointShop } from '@/components/shop/PointShop';

const REGULAR_GAMES = [
  { id: 'drawGuess', name: '그림 맞추기', emoji: '🎨' },
  { id: 'lineRunner', name: '라인 러너', emoji: '✏️' },
  { id: 'liarVote', name: '라이어 투표', emoji: '🕵️' },
  { id: 'typingBattle', name: '타이핑 배틀', emoji: '⌨️' },
  { id: 'bombPass', name: '폭탄 돌리기', emoji: '💣' },
  { id: 'priceGuess', name: '가격 맞추기', emoji: '💰' },
  { id: 'oxSurvival', name: 'OX 서바이벌', emoji: '⭕' },
  { id: 'tapSurvival', name: '탭 서바이벌', emoji: '👆' },
  { id: 'nunchiGame', name: '눈치 게임', emoji: '👀' },
  { id: 'quickTouch', name: '순발력 터치', emoji: '🎯' },
];

export default function RoomPage() {
  useWakeLock();
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const isMainRoom = roomId === 'main';
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
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [showGameLauncher, setShowGameLauncher] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeGame, setActiveGame] = useState<{ phase: string; gameName: string } | null>(null);
  const [autoGame, setAutoGame] = useState<{
    nextGameAt: number;
    nextGameType: string;
    nextGameName: string;
    reward: { type: string; amount: number; label: string };
  } | null>(null);
  const [autoCountdown, setAutoCountdown] = useState('');
  const autoGameTriggeredRef = React.useRef(false);
  const [userPoints, setUserPoints] = useState(0);
  const [showPointShop, setShowPointShop] = useState(false);
  const [roomLocked, setRoomLocked] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const canSeeUserList = profile?.isAdmin || profile?.isModerator || false;
  const isAdminOrMod = !!(profile?.isAdmin || profile?.isModerator);
  const canStartGame = true;

  const fmtCount = (n: number) => {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

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

  const handleStartRegularGame = async (gameId: string, gameName: string) => {
    if (!user || startingGame) return;
    if (onlineCount < 2) {
      alert("최소 2명 이상 접속해야 게임을 시작할 수 있습니다.");
      return;
    }
    const confirmed = window.confirm(
      `${gameName} 게임을 시작하시겠습니까?\n\n현재 ${onlineCount}명 접속 중\n10라운드 점수 누적전이 시작됩니다.`
    );
    if (!confirmed) return;

    setStartingGame(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/room/${roomId}/start-game`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameType: gameId }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        gameName?: string;
        totalPlayers?: number;
        totalRounds?: number;
      };
      if (data.success) {
        alert(`🎮 ${data.gameName} 시작!\n${data.totalPlayers}명 참가, ${data.totalRounds}라운드`);
        setShowGameLauncher(false);
      } else {
        alert(data.error || "게임 시작 실패");
      }
    } catch {
      alert("네트워크 오류");
    } finally {
      setStartingGame(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    const gameRef = ref(realtimeDb, `games/${roomId}/current`);
    const unsub = onValue(gameRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val() as { phase?: string; gameName?: string };
        setActiveGame({ phase: data.phase || 'idle', gameName: data.gameName || '' });
      } else {
        setActiveGame(null);
      }
    });
    return () => unsub();
  }, [roomId]);

  const triggerAutoGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${roomId}/auto-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'auto-game-secret-key' }),
      });
      const data = await res.json();
      if (!data.success && !data.skipped) {
        console.error('[AutoGame] Failed:', data.error);
      }
    } catch (err) {
      console.error('[AutoGame] Network error:', err);
    }
  }, [roomId]);

  useEffect(() => {
    const autoRef = ref(realtimeDb, `rooms/${roomId}/autoGame`);
    const unsub = onValue(autoRef, async (snap) => {
      if (snap.exists()) {
        setAutoGame(snap.val() as typeof autoGame);
      } else {
        setAutoGame(null);
        if (user?.uid) {
          const GAME_LIST = [
            { id: 'oxSurvival', name: '⭕ OX 서바이벌' },
            { id: 'tapSurvival', name: '👆 탭 서바이벌' },
            { id: 'priceGuess', name: '💰 가격 맞추기' },
            { id: 'typingBattle', name: '⌨️ 타이핑 배틀' },
            { id: 'quickTouch', name: '🎯 순발력 터치' },
          ];
          const next = GAME_LIST[Math.floor(Math.random() * GAME_LIST.length)];
          await set(autoRef, {
            nextGameAt: Date.now() + 30 * 60 * 1000,
            nextGameType: next.id,
            nextGameName: next.name,
            reward: { type: 'point', amount: 100, label: '100 포인트' },
          });
        }
      }
    });
    return () => unsub();
  }, [roomId, user?.uid]);

  useEffect(() => {
    if (!autoGame?.nextGameAt) return;

    const tick = () => {
      const diff = autoGame.nextGameAt - Date.now();
      if (diff <= 0) {
        setAutoCountdown('게임 시작 중...');
        if (!autoGameTriggeredRef.current && onlineUsers.length > 0 && onlineUsers[0]?.uid === user?.uid) {
          autoGameTriggeredRef.current = true;
          void triggerAutoGame();
        }
        return;
      }
      autoGameTriggeredRef.current = false;
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setAutoCountdown(`${min}분 ${sec.toString().padStart(2, '0')}초`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [autoGame?.nextGameAt, onlineUsers, user?.uid, triggerAutoGame]);

  const handleResetGame = useCallback(async (forceConfirm = false) => {
    if (!user) return;
    if (forceConfirm) {
      const confirmed = window.confirm('진행 중인 게임을 강제 초기화하시겠습니까?');
      if (!confirmed) return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/room/${roomId}/reset-game`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) {
        alert(data.error || '게임 초기화 실패');
      }
    } catch {
      alert('네트워크 오류');
    }
  }, [roomId, user]);

  useEffect(() => {
    if (chatCollapsed && messages.length > 0) {
      setUnreadCount((prev) => prev + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => {
    if (!user?.uid) {
      setUserPoints(0);
      return;
    }
    const userRef = doc(firestore, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      setUserPoints(snap.data()?.points ?? 0);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (isMainRoom || !roomId) return;
    const roomDocRef = doc(firestore, 'rooms', roomId);
    const unsub = onSnapshot(roomDocRef, (snap) => {
      setRoomLocked(!!(snap.exists() && snap.data()?.hasPassword));
    });
    return () => unsub();
  }, [roomId, isMainRoom]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-prize-500" />
      </div>
    );
  }

  if (roomLocked && !passwordVerified) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-white font-bold text-lg mb-2">비밀방입니다</h2>
          <p className="text-gray-400 text-sm mb-4">비밀번호를 입력해주세요</p>
          <input
            type="password"
            id="room-password"
            placeholder="비밀번호"
            maxLength={20}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mb-3 outline-none focus:ring-2 focus:ring-purple-500 text-center"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = document.getElementById('room-password') as HTMLInputElement;
                fetch(`/api/room/${roomId}/verify-password`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password: input.value }),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.success) setPasswordVerified(true);
                    else alert('비밀번호가 틀렸습니다');
                  });
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.getElementById('room-password') as HTMLInputElement;
              fetch(`/api/room/${roomId}/verify-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: input.value }),
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.success) setPasswordVerified(true);
                  else alert('비밀번호가 틀렸습니다');
                });
            }}
            className="w-full py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 transition"
          >
            입장하기
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2 mt-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // --- 메인방 콘텐츠 (기존 사이클 기반) ---
  const renderMainRoomContent = () => {
    // 자동 게임 진행 중이면 우선 표시
    if (activeGame && activeGame.phase !== 'idle' && activeGame.phase !== 'final_result') {
      return (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <RegularGamePlayer roomId={roomId} uid={user?.uid || ''} displayName={profile?.displayName || '익명'} />
        </div>
      );
    }

    if (!cycle || cycle.currentPhase === 'IDLE' || cycle.currentPhase === 'COOLDOWN') {
      return (
        <div className="flex flex-col items-center p-4 w-full overflow-y-auto gap-4">
          <CycleStatus
            phase={cyclePhase}
            nextSlotTime={cycle?.nextSlot}
            prizeTitle={cycle?.currentPrizeTitle}
            prizeImageURL={cycle?.currentPrizeImage}
          />

          {/* 자동 게임 대기 정보 */}
          {autoGame && (
            <div className="w-full bg-gradient-to-b from-gray-800/60 to-gray-900/60 border border-gray-700/50 rounded-2xl p-4 text-center">
              <div className="space-y-3">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <p className="text-purple-400 text-xs font-bold mb-1">⏰ 다음 자동 게임</p>
                  <p className="text-white text-lg font-bold">{autoGame.nextGameName}</p>
                  <p className="text-yellow-400 text-2xl font-bold mt-2">{autoCountdown}</p>
                  <p className="text-gray-400 text-xs mt-1">🏆 보상: {autoGame.reward?.label || '100 포인트'}</p>
                </div>

                {cycle?.nextSlot && cycle?.currentPrizeTitle && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <p className="text-yellow-400 text-xs font-bold mb-2">🎁 다음 경품 게임</p>
                    {cycle.currentPrizeImage && (
                      <div className="flex justify-center mb-2">
                        <Image
                          src={cycle.currentPrizeImage}
                          alt={cycle.currentPrizeTitle}
                          width={80}
                          height={80}
                          className="w-20 h-20 rounded-xl object-cover shadow-lg border border-yellow-500/30"
                        />
                      </div>
                    )}
                    <p className="text-white text-sm font-bold">{cycle.currentPrizeTitle}</p>
                    <p className="text-yellow-300 text-xs mt-1">
                      {new Date(cycle.nextSlot).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 게임 진행 중이면 RegularGamePlayer 표시 */}
          {activeGame && activeGame.phase !== 'idle' && activeGame.phase !== 'final_result' && (
            <div className="w-full">
              <RegularGamePlayer roomId={roomId} uid={user?.uid || ''} displayName={profile?.displayName || '익명'} />
            </div>
          )}

          {activeGame && activeGame.phase === 'final_result' && (
            <div className="w-full">
              <RegularGamePlayer roomId={roomId} uid={user?.uid || ''} displayName={profile?.displayName || '익명'} />
            </div>
          )}

          <div className="w-full">
            <MiniGameLauncher />
          </div>
        </div>
      );
    }

    if (cycle.currentPhase === 'ANNOUNCING') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4 overflow-y-auto">
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
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
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
        <div className="flex-1 flex flex-col overflow-y-auto">
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
        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-4 py-4">
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
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-4 max-w-sm w-full text-center">
              <p className="text-gray-400 text-sm">다음 경품에 도전해 보세요! 💪</p>
            </div>
          )}

          <button onClick={() => setShowFreePlay(true)} className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg animate-pulse">
            🎮 다른 게임 더 하기!
          </button>
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

  // --- 커스텀방 콘텐츠 (정규게임 매니저 시작 + 미니게임) ---
  const renderCustomRoomContent = () => {
    if (activeGame && activeGame.phase !== 'idle' && activeGame.phase !== 'final_result') {
      return (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <RegularGamePlayer roomId={roomId} uid={user?.uid || ''} displayName={profile?.displayName || '익명'} />
          {isAdminOrMod && (
            <div className="p-4">
              <button
                onClick={() => void handleResetGame(true)}
                className="w-full py-3 bg-red-600/20 border border-red-500/40 text-red-300 rounded-xl text-sm font-bold hover:bg-red-600/30 transition"
              >
                ⚠️ 게임 강제 초기화
              </button>
            </div>
          )}
        </div>
      );
    }

    if (activeGame && activeGame.phase === 'final_result') {
      return (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <RegularGamePlayer roomId={roomId} uid={user?.uid || ''} displayName={profile?.displayName || '익명'} />
          {isAdminOrMod && (
            <div className="p-4">
              <button
                onClick={() => void handleResetGame(false)}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition"
              >
                🔄 게임 초기화 (새 게임 시작 가능)
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        {/* 정규게임 시작 패널 (관리자/매니저 무제한, 일반 유저 하루 1회) */}
        {canStartGame && (
          <div className="w-full">
            <button
              onClick={() => setShowGameLauncher(!showGameLauncher)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl"
            >
              <span className="text-white font-bold text-sm">
                🏆 정규게임 시작 {isAdminOrMod ? '(무제한)' : '(하루 1회)'}
              </span>
              <span className="text-gray-400 text-xs">{showGameLauncher ? '접기 ▲' : '펼치기 ▼'}</span>
            </button>
            {showGameLauncher && (
              <div className="mt-2 grid grid-cols-5 gap-2">
                {REGULAR_GAMES.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => void handleStartRegularGame(game.id, game.name)}
                    disabled={startingGame || onlineCount < 2}
                    className="flex flex-col items-center gap-1 p-2 bg-gray-800 rounded-xl border border-gray-700 hover:border-purple-500/50 hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-xl">{game.emoji}</span>
                    <span className="text-[9px] text-white font-medium text-center leading-tight">{game.name}</span>
                  </button>
                ))}
                {onlineCount < 2 && (
                  <p className="col-span-5 text-center text-red-400 text-xs">최소 2명 접속 시 시작 가능</p>
                )}
                {!isAdminOrMod && (
                  <p className="col-span-5 text-center text-yellow-400 text-xs mt-1">
                    ⚡ 일반 유저는 하루 1회 게임 생성 가능
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 자동 게임 대기 정보 */}
        <div className="bg-gradient-to-b from-gray-800/60 to-gray-900/60 border border-gray-700/50 rounded-2xl p-5 text-center">
          <div className="text-5xl mb-3">🎮</div>
          <h2 className="text-xl font-bold text-white mb-1">자유 게임방</h2>
          <p className="text-green-400 text-xs font-bold mb-4">👥 {fmtCount(onlineCount)}명 접속 중</p>

          {autoGame && (
            <div className="space-y-3">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-purple-400 text-xs font-bold mb-1">⏰ 다음 자동 게임</p>
                <p className="text-white text-lg font-bold">{autoGame.nextGameName}</p>
                <p className="text-yellow-400 text-2xl font-bold mt-2">{autoCountdown}</p>
                <p className="text-gray-400 text-xs mt-1">🏆 보상: {autoGame.reward?.label || '100 포인트'}</p>
              </div>

              {cycle?.nextSlot && cycle?.currentPrizeTitle && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-yellow-400 text-xs font-bold mb-2">🎁 다음 경품 게임</p>
                  {cycle.currentPrizeImage && (
                    <div className="flex justify-center mb-2">
                      <Image
                        src={cycle.currentPrizeImage}
                        alt={cycle.currentPrizeTitle}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-xl object-cover shadow-lg border border-yellow-500/30"
                      />
                    </div>
                  )}
                  <p className="text-white text-sm font-bold">{cycle.currentPrizeTitle}</p>
                  <p className="text-yellow-300 text-xs mt-1">
                    {new Date(cycle.nextSlot).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          )}

          {!autoGame && (
            <p className="text-gray-400 text-sm">참여하고 싶은 미니게임을 선택하세요</p>
          )}
        </div>

        {/* 미니게임 */}
        <MiniGameLauncher />
      </div>
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
            <h1 className="text-white font-bold text-sm">{isMainRoom ? 'PrizeLive' : '자유방'}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {canSeeUserList ? (
              <button onClick={() => setShowUserList(!showUserList)} className="relative">
                <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded-full border border-gray-700 hover:border-yellow-500/50 transition-colors">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-xs font-bold">{fmtCount(onlineCount)}명</span>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded-full border border-gray-700">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-bold">{fmtCount(onlineCount)}명</span>
              </div>
            )}
            <SoundToggle />
            {hasTicket && <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0.5">🎫</Badge>}
            <button onClick={() => setShowPointShop(true)} className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 rounded-full">
              <span className="text-yellow-400 text-xs font-bold">🪙 {userPoints.toLocaleString()}P</span>
            </button>
            {profile && <LevelBadge level={profile.level} size="sm" />}
          </div>
        </div>
      </header>

      {/* 참가자 목록 패널 */}
      {showUserList && canSeeUserList && (
        <div className="absolute top-12 right-2 z-[100] w-64 max-h-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-xs font-bold text-white">접속자 목록 ({fmtCount(onlineCount)}명)</span>
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
        <main className={`${chatCollapsed ? 'flex-1' : 'flex-[3]'} lg:flex-1 min-h-0 overflow-y-auto`}>
          {isMainRoom ? renderMainRoomContent() : renderCustomRoomContent()}
        </main>

        {/* 채팅 영역 — 접기/펼치기 가능 */}
        <aside
          className={`${
            chatCollapsed ? 'shrink-0' : 'flex-[2]'
          } lg:flex-none lg:w-80 min-h-0 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-800 transition-all duration-300`}
        >
          {chatCollapsed ? (
            <div className="bg-black/40 px-3 py-2">
              <button
                onClick={() => {
                  setChatCollapsed(false);
                  setUnreadCount(0);
                }}
                className="w-full flex items-center justify-between text-xs text-gray-400 mb-2"
              >
                <span className="font-bold">
                  💬 채팅 열기{' '}
                  {unreadCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
                <span>▲</span>
              </button>
              <div className="space-y-1">
                {messages.slice(-2).map((msg, i) => (
                  <div key={i} className="text-xs truncate">
                    <span className="text-yellow-400 font-bold mr-1">
                      {msg.displayName || '익명'}:
                    </span>
                    <span className="text-gray-300">{msg.message || ''}</span>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-[10px] text-gray-600">메시지가 없습니다</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setChatCollapsed(true)}
                className="shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-800/80 border-b border-gray-700 hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-400 text-xs font-bold">💬 채팅 접기 ▼</span>
              </button>
              <div className="flex-1 min-h-0">
                <ChatWindow
                  messages={messages}
                  onSendMessage={(msg) => void sendMessage(msg)}
                  currentUid={user?.uid || ''}
                  onKick={handleKick}
                />
              </div>
            </>
          )}
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

      <PointShop
        isOpen={showPointShop}
        onClose={() => setShowPointShop(false)}
        userPoints={userPoints}
        uid={user?.uid || ''}
      />
    </div>
  );
}
