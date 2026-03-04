'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue } from 'firebase/database';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { realtimeDb, firestore } from '@/lib/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { usePresence } from '@/hooks/usePresence';
import { useChat } from '@/hooks/useChat';
import { useCycle } from '@/hooks/useCycle';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useWakeLock } from '@/hooks/useWakeLock';
import type { CyclePhase } from '@/types/cycle';
import ChatWindow from '@/components/chat/ChatWindow';
import LiveBadge from '@/components/room/LiveBadge';
import { LevelBadge } from '@/components/user/LevelBadge';
import CycleStatus from '@/components/cycle/CycleStatus';
import { GameContainer } from '@/components/game/GameContainer';
import RegularGamePlayer from '@/components/game/RegularGamePlayer';
import FreePlayLobby from '@/components/game/FreePlayLobby';
import { PointShop } from '@/components/shop/PointShop';
import { Badge } from '@/components/ui/badge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { ArrowLeft, Users, MessageCircle, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import type { OnlineUser } from '@/hooks/usePresence';

// ─── 정규 게임 목록 (id / name / emoji) ───
const REGULAR_GAMES = [
  { id: 'drawGuess', name: '그림 맞추기', emoji: '🎨' },
  { id: 'lineRunner', name: '라인 러너', emoji: '✏️' },
  { id: 'bigRoulette', name: '빅 룰렛', emoji: '🎰' },
  { id: 'typingBattle', name: '타이핑 배틀', emoji: '⌨️' },
  { id: 'weaponForge', name: '무기 강화 대전', emoji: '⚔️' },
  { id: 'priceGuess', name: '가격 맞추기', emoji: '💰' },
  { id: 'oxSurvival', name: 'OX 서바이벌', emoji: '⭕' },
  { id: 'destinyAuction', name: '운명의 경매', emoji: '🎰' },
  { id: 'nunchiGame', name: '눈치 게임', emoji: '👀' },
  { id: 'quickTouch', name: '순발력 터치', emoji: '🎯' },
] as const;

interface GameCurrent {
  gameType: string;
  gameName?: string;
  phase?: string;
  round?: number;
  totalRounds?: number;
  totalPlayers?: number;
  startedAt?: number;
  reward?: { type: string; amount: number; label: string };
  config?: Record<string, unknown>;
}

interface AutoGameData {
  phase?: string;
  nextGameAt?: number;
  nextGameType?: string;
  nextGameName?: string;
  reward?: { type: string; amount: number; label: string };
  recruitingUntil?: number;
  joinedPlayers?: Record<string, { displayName: string; joinedAt: number }>;
}

interface RoomData {
  name: string;
  hasPassword: boolean;
}

export default function RoomClient() {
  const params = useParams();
  const roomId = (params?.roomId as string) || '';
  const router = useRouter();
  const { user, profile } = useAuthStore();

  const isMainRoom = roomId === 'main';

  // Room meta (Firestore)
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [roomLocked, setRoomLocked] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);

  const { onlineCount, onlineUsers } = usePresence(roomId, user?.uid ?? null);
  const sender = profile
    ? {
        uid: profile.uid,
        displayName: profile.displayName || '익명',
        photoURL: profile.photoURL,
        level: profile.level,
        isModerator: profile.isModerator,
        isAdmin: profile.isAdmin,
      }
    : undefined;
  const { messages, sendMessage } = useChat(roomId, sender);
  const { cycle, isLoading: cycleLoading, isLive } = useCycle(roomId);
  useWakeLock();

  // State
  const [showUserList, setShowUserList] = useState(false);
  const [showFreePlay, setShowFreePlay] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [showGameLauncher, setShowGameLauncher] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeGame, setActiveGame] = useState<GameCurrent | null>(null);
  const [autoGame, setAutoGame] = useState<AutoGameData | null>(null);
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [recruitCountdown, setRecruitCountdown] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [showPointShop, setShowPointShop] = useState(false);
  const [nextPrize, setNextPrize] = useState<{ title: string | null; imageURL: string | null; nextSlot: string | null }>({
    title: null,
    imageURL: null,
    nextSlot: null,
  });
  const [showPrizeDetail, setShowPrizeDetail] = useState(false);
  const [loading, setLoading] = useState(true);

  const chatCollapsedRef = useRef(false);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    chatCollapsedRef.current = chatCollapsed;
  }, [chatCollapsed]);

  useEffect(() => {
    if (chatCollapsed && messages.length > lastMessageCountRef.current) {
      setUnreadCount((c) => c + messages.length - lastMessageCountRef.current);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, chatCollapsed]);

  // Room doc (name, hasPassword)
  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(firestore, 'rooms', roomId);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setRoomData({
            name: (d?.name as string) || roomId,
            hasPassword: !!(d?.hasPassword ?? d?.password),
          });
          setRoomLocked(!!(d?.hasPassword ?? d?.password));
          if (!(d?.hasPassword ?? d?.password)) setPasswordVerified(true);
        } else {
          setRoomData({ name: roomId === 'main' ? '메인' : roomId, hasPassword: false });
          setRoomLocked(false);
          setPasswordVerified(true);
        }
        setLoading(false);
      },
      () => {
        setRoomData({ name: roomId === 'main' ? '메인' : roomId, hasPassword: false });
        setRoomLocked(false);
        setPasswordVerified(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [roomId]);

  // User points
  useEffect(() => {
    if (!profile?.uid) return;
    const userRef = doc(firestore, 'users', profile.uid);
    getDoc(userRef).then((snap) => {
      if (snap.exists()) setUserPoints((snap.data()?.points as number) ?? 0);
    });
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setUserPoints((snap.data()?.points as number) ?? 0);
    });
    return () => unsub();
  }, [profile?.uid]);

  // games/{roomId}/current
  useEffect(() => {
    if (!roomId) return;
    const gameRef = ref(realtimeDb, `games/${roomId}/current`);
    const unsub = onValue(gameRef, (snap) => {
      if (snap.exists()) setActiveGame(snap.val() as GameCurrent);
      else setActiveGame(null);
    });
    return () => unsub();
  }, [roomId]);

  // rooms/{roomId}/autoGame (main room)
  useEffect(() => {
    if (!roomId || !isMainRoom) return;
    const autoRef = ref(realtimeDb, `rooms/${roomId}/autoGame`);
    const unsub = onValue(autoRef, (snap) => {
      if (snap.exists()) setAutoGame(snap.val() as AutoGameData);
      else setAutoGame(null);
    });
    return () => unsub();
  }, [roomId, isMainRoom]);

  // Auto countdown (nextGameAt)
  useEffect(() => {
    if (!autoGame?.nextGameAt) {
      setAutoCountdown(0);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, Math.ceil((autoGame.nextGameAt! - Date.now()) / 1000));
      setAutoCountdown(diff);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [autoGame?.nextGameAt]);

  // Recruit countdown (recruitingUntil)
  useEffect(() => {
    if (!autoGame?.recruitingUntil) {
      setRecruitCountdown(0);
      return;
    }
    const tick = () => {
      const diff = Math.max(0, Math.ceil((autoGame.recruitingUntil! - Date.now()) / 1000));
      setRecruitCountdown(diff);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [autoGame?.recruitingUntil]);

  // Next prize from cycle
  useEffect(() => {
    if (!cycle) return;
    setNextPrize({
      title: cycle.currentPrizeTitle ?? null,
      imageURL: cycle.currentPrizeImage ?? null,
      nextSlot: cycle.nextSlot ?? null,
    });
  }, [cycle]);

  useGameSounds(cycle?.currentPhase ?? undefined, activeGame?.gameType);

  const handleKick = useCallback(
    async (uid: string, displayName: string) => {
      if (!profile?.uid || (!profile.isAdmin && !profile.isModerator)) return;
      try {
        const config = await import('@/lib/firebase/config');
        const token = await config.auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch('/api/admin/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: 'kick', targetUid: uid, targetDisplayName: displayName, roomId }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) alert(data.error || '강퇴 실패');
      } catch (e) {
        console.error(e);
        alert('강퇴 요청 실패');
      }
    },
    [roomId, profile]
  );

  const handleStartRegularGame = useCallback(
    async (gameType: string) => {
      if (!user || !roomId) return;
      setStartingGame(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/room/${roomId}/start-game`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ gameType }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) alert(data.error || '게임 시작 실패');
        else setShowGameLauncher(false);
      } catch (e) {
        console.error(e);
        alert('게임 시작 요청 실패');
      } finally {
        setStartingGame(false);
      }
    },
    [user, roomId]
  );

  const handleResetGame = useCallback(async () => {
    if (!user || !roomId) return;
    if (!confirm('게임을 초기화할까요?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/room/${roomId}/reset-game`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) alert(data.error || '초기화 실패');
    } catch (e) {
      console.error(e);
      alert('초기화 요청 실패');
    }
  }, [user, roomId]);

  const joinAutoGame = useCallback(async () => {
    if (!user || !roomId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/room/${roomId}/auto-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'join' }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) alert(data.error || '참가 실패');
    } catch (e) {
      console.error(e);
      alert('참가 요청 실패');
    }
  }, [user, roomId]);

  const handleChatExpand = () => {
    setChatCollapsed(false);
    setUnreadCount(0);
  };

  const renderMainRoomContent = () => {
    const phase = (cycle?.currentPhase ?? 'IDLE') as CyclePhase;
    const nextSlotTime = cycle?.nextSlot ?? null;
    const prizeTitle = cycle?.currentPrizeTitle ?? null;
    const prizeImageURL = cycle?.currentPrizeImage ?? null;

    if (cycleLoading) {
      return (
        <div className="flex items-center justify-center flex-1 min-h-[200px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
        </div>
      );
    }

    const hasActiveRegularGame =
      activeGame &&
      activeGame.phase &&
      activeGame.phase !== 'idle' &&
      activeGame.phase !== 'final_result' &&
      REGULAR_GAMES.some((g) => g.id === activeGame.gameType);

    if (hasActiveRegularGame && activeGame && user && profile) {
      return (
        <RegularGamePlayer
          roomId={roomId}
          uid={profile.uid}
          displayName={profile.displayName || '익명'}
        />
      );
    }

    const isAutoRecruiting = autoGame?.phase === 'recruiting';
    const isAutoWaiting = autoGame?.phase === 'waiting';

    return (
      <div className="flex flex-col flex-1 w-full min-h-0">
        <CycleStatus
          phase={phase}
          nextSlotTime={nextSlotTime}
          prizeTitle={prizeTitle}
          prizeImageURL={prizeImageURL}
        />

        {isMainRoom && (isAutoWaiting || isAutoRecruiting) && (
          <div className="mt-4 mx-4 p-4 bg-gray-800/80 rounded-xl border border-gray-700">
            <p className="text-sm font-semibold text-yellow-400 mb-2">
              {isAutoRecruiting ? '🎮 자동 게임 모집 중' : '⏰ 다음 자동 게임'}
            </p>
            {isAutoRecruiting ? (
              <>
                <p className="text-white text-sm mb-2">
                  {autoGame.nextGameName} · 보상: {autoGame.reward?.label ?? '100 포인트'}
                </p>
                <p className="text-gray-400 text-xs mb-2">참가 인원: {Object.keys(autoGame.joinedPlayers ?? {}).length}명</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono tabular-nums">{recruitCountdown}초</span>
                  <span className="text-gray-500 text-sm">후 시작</span>
                </div>
                {user && (
                  <button
                    onClick={joinAutoGame}
                    className="mt-3 w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition"
                  >
                    참가하기
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-white text-sm">{autoGame?.nextGameName ?? '랜덤 게임'}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {Math.floor(autoCountdown / 60)}분 {autoCountdown % 60}초 후
                </p>
              </>
            )}
          </div>
        )}

        {!hasActiveRegularGame && (
          <div className="flex flex-col items-center justify-center flex-1 py-8 px-4">
            <p className="text-gray-500 text-sm mb-4">경품 게임 대기 중이거나 자유 플레이를 즐기세요.</p>
            <button
              onClick={() => setShowFreePlay(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition"
            >
              미니게임 하기
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCustomRoomContent = () => {
    const hasActiveRegularGame =
      activeGame &&
      activeGame.phase &&
      activeGame.phase !== 'idle' &&
      activeGame.phase !== 'final_result' &&
      REGULAR_GAMES.some((g) => g.id === activeGame.gameType);

    if (hasActiveRegularGame && activeGame && user && profile) {
      return (
        <RegularGamePlayer
          roomId={roomId}
          uid={profile.uid}
          displayName={profile.displayName || '익명'}
        />
      );
    }

    if (user && profile) {
      return (
        <div className="flex flex-col flex-1 min-h-0">
          <GameContainer
            roomId={roomId}
            uid={profile.uid}
            displayName={profile.displayName || '익명'}
            photoURL={profile.photoURL}
            level={profile.level}
          />
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowGameLauncher(true)}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition"
            >
              정규 게임 시작
            </button>
            {(profile.isAdmin || profile.isModerator || activeGame?.startedAt) && (
              <button
                onClick={() => handleResetGame()}
                className="ml-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-xl transition"
              >
                게임 초기화
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center flex-1 text-gray-500 py-12">
        <p>로그인하면 게임에 참여할 수 있어요.</p>
      </div>
    );
  };

  const handlePasswordSubmit = async (password: string) => {
    try {
      const res = await fetch(`/api/room/${roomId}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) setPasswordVerified(true);
      else alert(data.error || '비밀번호가 틀렸습니다');
    } catch {
      alert('확인 요청 실패');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (roomLocked && !passwordVerified) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-xl font-bold mb-2">{roomData?.name ?? roomId}</h1>
        <p className="text-gray-400 text-sm mb-4">비밀번호를 입력하세요</p>
        <form
          className="w-full max-w-xs flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.querySelector<HTMLInputElement>('input[name="password"]');
            if (input?.value) handlePasswordSubmit(input.value);
          }}
        >
          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            autoFocus
          />
          <button type="submit" className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg">
            입장
          </button>
        </form>
        <button
          onClick={() => router.push('/rooms')}
          className="mt-4 text-gray-400 hover:text-white text-sm"
        >
          목록으로
        </button>
      </div>
    );
  }

  const roomName = roomData?.name ?? (roomId === 'main' ? '메인' : roomId);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push('/rooms')}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-300"
            aria-label="뒤로"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm truncate">{roomName}</span>
          {isLive && <LiveBadge />}
          <button
            onClick={() => setShowUserList((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs"
          >
            <Users size={14} />
            {onlineCount}
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SoundToggle size="sm" />
          {isMainRoom && (
            <button
              onClick={() => setShowPointShop(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium"
            >
              <ShoppingBag size={14} />
              {userPoints.toLocaleString()}P
            </button>
          )}
          {profile && <LevelBadge level={profile.level} size="sm" />}
        </div>
      </header>

      {/* User list panel */}
      {showUserList && (
        <div className="shrink-0 border-b border-gray-800 bg-gray-900/60 max-h-48 overflow-y-auto">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">접속 중 ({onlineUsers.length})</span>
            <button onClick={() => setShowUserList(false)} className="text-gray-500 hover:text-white p-1">
              <ChevronUp size={16} />
            </button>
          </div>
          <ul className="px-3 pb-2 space-y-1">
            {onlineUsers.map((u: OnlineUser) => (
              <li key={u.uid} className="flex items-center gap-2 text-sm">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-600" />
                )}
                <span className="truncate">{u.displayName}</span>
                <LevelBadge level={u.level} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Main + Chat layout */}
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-auto">
          {isMainRoom ? renderMainRoomContent() : renderCustomRoomContent()}
        </main>

        {/* Chat aside */}
        <aside
          className={`shrink-0 flex flex-col border-l border-gray-800 bg-gray-900/50 transition-all ${
            chatCollapsed ? 'w-10' : 'w-72 sm:w-80'
          }`}
        >
          {chatCollapsed ? (
            <div className="flex flex-col h-full">
              <button
                onClick={handleChatExpand}
                className="flex items-center justify-center gap-1 py-2 border-b border-gray-800 hover:bg-gray-800/50 relative"
              >
                <MessageCircle size={18} />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center p-0 text-[10px] bg-red-500">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-gray-800">
                <span className="text-xs font-semibold text-gray-400">채팅</span>
                <button
                  onClick={() => setChatCollapsed(true)}
                  className="p-1 text-gray-500 hover:text-white"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatWindow
                  messages={messages}
                  onSendMessage={sendMessage}
                  currentUid={profile?.uid}
                  onKick={handleKick}
                />
              </div>
            </>
          )}
        </aside>
      </div>

      {/* FreePlay Lobby modal */}
      {showFreePlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setShowFreePlay(false)}
        >
          <div
            className="bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">미니게임</h2>
              <button onClick={() => setShowFreePlay(false)} className="p-1 rounded hover:bg-gray-700">
                ✕
              </button>
            </div>
            <FreePlayLobby roomId={roomId} />
          </div>
        </div>
      )}

      {/* Game launcher modal (custom room) */}
      {showGameLauncher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setShowGameLauncher(false)}
        >
          <div
            className="bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">정규 게임 선택</h2>
              <button onClick={() => setShowGameLauncher(false)} className="p-1 rounded hover:bg-gray-700">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {REGULAR_GAMES.map((g) => (
                <button
                  key={g.id}
                  disabled={startingGame}
                  onClick={() => handleStartRegularGame(g.id)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-left transition disabled:opacity-50"
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span className="text-sm font-medium truncate">{g.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prize detail modal */}
      {showPrizeDetail && nextPrize.title && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setShowPrizeDetail(false)}
        >
          <div
            className="bg-gray-800 rounded-2xl max-w-sm w-full p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {nextPrize.imageURL && (
              <img
                src={nextPrize.imageURL}
                alt={nextPrize.title}
                className="w-24 h-24 rounded-xl object-cover mx-auto mb-3 border-2 border-purple-500/30"
              />
            )}
            <h3 className="text-lg font-bold text-white">{nextPrize.title}</h3>
            {nextPrize.nextSlot && <p className="text-gray-400 text-sm mt-1">{nextPrize.nextSlot}</p>}
            <button
              onClick={() => setShowPrizeDetail(false)}
              className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Point shop */}
      <PointShop
        isOpen={showPointShop}
        onClose={() => setShowPointShop(false)}
        userPoints={userPoints}
        uid={profile?.uid ?? ''}
      />
    </div>
  );
}
