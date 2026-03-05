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
import RegularGamePlayer from '@/components/game/RegularGamePlayer'; // eslint-disable-line @typescript-eslint/no-unused-vars -- STEP 2 이후 제거 예정
import GamePlayingView from '@/components/game/GamePlayingView';
import FreePlayLobby from '@/components/game/FreePlayLobby';
import { PointShop } from '@/components/shop/PointShop';
import { Badge } from '@/components/ui/badge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { ArrowLeft, Users, MessageCircle, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import type { OnlineUser } from '@/hooks/usePresence';

const REGULAR_GAMES = [
  { id: 'drawGuess', name: '그림 맞추기', emoji: '🎨' },
  { id: 'flappyBattle', name: '플래피 배틀', emoji: '🐦' },
  { id: 'bigRoulette', name: '빅 룰렛', emoji: '🎰' },
  { id: 'typingBattle', name: '타이핑 레이스', emoji: '⌨️' },
  { id: 'priceGuess', name: '가격을 맞춰라', emoji: '💰' },
  { id: 'blindAuction', name: '블라인드 경매', emoji: '📦' },
  { id: 'bombSurvival', name: '폭탄 해제', emoji: '💣' },
  { id: 'tetrisBattle', name: '테트리스 배틀', emoji: '🧱' },
  { id: 'memoryMatch', name: '메모리 매치', emoji: '🃏' },
  { id: 'slitherBattle', name: '스네이크 서바이벌', emoji: '🐍' },
  { id: 'weaponForge', name: '검 강화', emoji: '⚔️' },
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

  const [showUserList, setShowUserList] = useState(false);
  const [showFreePlay, setShowFreePlay] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [showGameLauncher, setShowGameLauncher] = useState(false);
  const [selectedGameForLaunch, setSelectedGameForLaunch] = useState<string | null>(null);
  const [startingGame, setStartingGame] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeGame, setActiveGame] = useState<GameCurrent | null>(null);
  const [autoGame, setAutoGame] = useState<AutoGameData | null>(null);
  const [autoCountdown, setAutoCountdown] = useState(0);
  const [recruitCountdown, setRecruitCountdown] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [showPointShop, setShowPointShop] = useState(false);
  const [nextPrize, setNextPrize] = useState<{ title: string | null; imageURL: string | null; nextSlot: string | null }>({
    title: null, imageURL: null, nextSlot: null,
  });
  const [showPrizeDetail, setShowPrizeDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayVisitors, setTodayVisitors] = useState<number | null>(null);

  const chatCollapsedRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const chatWasCollapsedRef = useRef<boolean | null>(null);

  useEffect(() => { chatCollapsedRef.current = chatCollapsed; }, [chatCollapsed]);

  const isGameActivePhase = useCallback((phase: string | undefined) => {
    return !!phase && phase !== 'idle' && phase !== 'waiting';
  }, []);

  useEffect(() => {
    const isPlayingPhase =
      activeGame && activeGame.phase &&
      activeGame.phase !== 'idle' && activeGame.phase !== 'final_result' && activeGame.phase !== 'waiting' &&
      REGULAR_GAMES.some((g) => g.id === activeGame.gameType);

    if (isPlayingPhase) {
      if (chatWasCollapsedRef.current === null) {
        chatWasCollapsedRef.current = chatCollapsedRef.current;
      }
      if (!chatCollapsedRef.current) {
        setChatCollapsed(true);
      }
    } else if (chatWasCollapsedRef.current !== null) {
      const shouldRestore = chatWasCollapsedRef.current === false;
      chatWasCollapsedRef.current = null;
      if (shouldRestore) {
        setChatCollapsed(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame?.phase, activeGame?.gameType]);

  useEffect(() => {
    if (chatCollapsed && messages.length > lastMessageCountRef.current) {
      setUnreadCount((c) => c + messages.length - lastMessageCountRef.current);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, chatCollapsed]);

  useEffect(() => {
    if (!profile?.isAdmin) return;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();

    const fetchVisitors = async () => {
      try {
        const { collection, query, where, getCountFromServer } = await import('firebase/firestore');
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('lastVisit', '>=', todayStart));
        const snapshot = await getCountFromServer(q);
        setTodayVisitors(snapshot.data().count);
      } catch (e) {
        console.error('Failed to fetch today visitors:', e);
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const usersRef = collection(firestore, 'users');
          const q = query(usersRef, where('lastVisit', '>=', todayStart));
          const snap = await getDocs(q);
          setTodayVisitors(snap.size);
        } catch (e2) {
          console.error('Fallback visitor count also failed:', e2);
        }
      }
    };

    fetchVisitors();
    const interval = setInterval(fetchVisitors, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [profile?.isAdmin]);

  useEffect(() => {
    if (!roomId) return;
    const roomRef = doc(firestore, 'rooms', roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setRoomData({ name: (d?.name as string) || roomId, hasPassword: !!(d?.hasPassword ?? d?.password) });
        setRoomLocked(!!(d?.hasPassword ?? d?.password));
        if (!(d?.hasPassword ?? d?.password)) setPasswordVerified(true);
      } else {
        setRoomData({ name: roomId === 'main' ? '메인' : roomId, hasPassword: false });
        setRoomLocked(false); setPasswordVerified(true);
      }
      setLoading(false);
    }, () => {
      setRoomData({ name: roomId === 'main' ? '메인' : roomId, hasPassword: false });
      setRoomLocked(false); setPasswordVerified(true); setLoading(false);
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!profile?.uid) return;
    const userRef = doc(firestore, 'users', profile.uid);
    getDoc(userRef).then((snap) => { if (snap.exists()) setUserPoints((snap.data()?.points as number) ?? 0); });
    const unsub = onSnapshot(userRef, (snap) => { if (snap.exists()) setUserPoints((snap.data()?.points as number) ?? 0); });
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (!roomId) return;
    const gameRef = ref(realtimeDb, `games/${roomId}/current`);
    const unsub = onValue(gameRef, (snap) => { if (snap.exists()) setActiveGame(snap.val() as GameCurrent); else setActiveGame(null); });
    return () => unsub();
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !isMainRoom) return;
    const autoRef = ref(realtimeDb, `rooms/${roomId}/autoGame`);
    const unsub = onValue(autoRef, (snap) => { if (snap.exists()) setAutoGame(snap.val() as AutoGameData); else setAutoGame(null); });
    return () => unsub();
  }, [roomId, isMainRoom]);

  useEffect(() => {
    if (!autoGame?.nextGameAt) { setAutoCountdown(0); return; }
    const tick = () => { setAutoCountdown(Math.max(0, Math.ceil((autoGame.nextGameAt! - Date.now()) / 1000))); };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [autoGame?.nextGameAt]);

  useEffect(() => {
    if (!autoGame?.recruitingUntil) { setRecruitCountdown(0); return; }
    const tick = () => { setRecruitCountdown(Math.max(0, Math.ceil((autoGame.recruitingUntil! - Date.now()) / 1000))); };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [autoGame?.recruitingUntil]);

  useEffect(() => {
    if (!cycle) return;
    setNextPrize({ title: cycle.currentPrizeTitle ?? null, imageURL: cycle.currentPrizeImage ?? null, nextSlot: cycle.nextSlot ?? null });
  }, [cycle]);

  const isRegularGamePlaying =
    activeGame &&
    activeGame.phase &&
    ['playing', 'advancing', 'round_result', 'game_intro'].includes(activeGame.phase) &&
    REGULAR_GAMES.some((g) => g.id === activeGame.gameType);
  useGameSounds(
    isRegularGamePlaying ? undefined : (cycle?.currentPhase ?? undefined),
    activeGame?.gameType
  );

  const handleKick = useCallback(async (uid: string, displayName: string) => {
    if (!profile?.uid || (!profile.isAdmin && !profile.isModerator)) return;
    try {
      const config = await import('@/lib/firebase/config');
      const token = await config.auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch('/api/admin/moderate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'kick', targetUid: uid, targetDisplayName: displayName, roomId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) alert(data.error || '강퇴 실패');
    } catch (e) { console.error(e); alert('강퇴 요청 실패'); }
  }, [roomId, profile]);

  const handleStartRegularGame = useCallback(async (gameType: string, rounds: number) => {
    if (!user || !roomId) return;
    setStartingGame(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/room/${roomId}/start-game`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gameType, rounds }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) alert(data.error || '게임 시작 실패');
      else { setShowGameLauncher(false); setSelectedGameForLaunch(null); }
    } catch (e) { console.error(e); alert('게임 시작 요청 실패'); } finally { setStartingGame(false); }
  }, [user, roomId]);

  const handleResetGame = useCallback(async () => {
    if (!user || !roomId) return;
    if (!confirm('게임을 초기화할까요?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/room/${roomId}/reset-game`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) alert(data.error || '초기화 실패');
    } catch (e) { console.error(e); alert('초기화 요청 실패'); }
  }, [user, roomId]);

  const joinAutoGame = useCallback(async () => {
    if (!user || !roomId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/room/${roomId}/auto-game`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'join' }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) alert(data.error || '참가 실패');
    } catch (e) { console.error(e); alert('참가 요청 실패'); }
  }, [user, roomId]);

  const handleChatExpand = () => { setChatCollapsed(false); setUnreadCount(0); };

  /* ── 메인방 콘텐츠 ── */
  const renderMainRoomContent = () => {
    const phase = (cycle?.currentPhase ?? 'IDLE') as CyclePhase;
    const nextSlotTime = cycle?.nextSlot ?? null;
    const prizeTitle = cycle?.currentPrizeTitle ?? null;
    const prizeImageURL = cycle?.currentPrizeImage ?? null;

    // ★ 디버그: cycle 전체 데이터 확인
    console.log('[RoomClient] cycle raw data:', JSON.stringify(cycle));

    if (cycleLoading) {
      return (
        <div className="flex items-center justify-center flex-1 min-h-[200px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neon-magenta" />
        </div>
      );
    }

    const hasActiveRegularGame =
      activeGame &&
      isGameActivePhase(activeGame.phase) &&
      REGULAR_GAMES.some((g) => g.id === activeGame.gameType);

    if (hasActiveRegularGame && activeGame && user && profile) {
      return <GamePlayingView roomId={roomId} />;
    }

    const isAutoRecruiting = autoGame?.phase === 'recruiting' &&
      (autoGame?.recruitingUntil ? autoGame.recruitingUntil > Date.now() : true);
    const isAutoWaiting = autoGame?.phase === 'waiting' &&
      (autoGame?.nextGameAt ? autoGame.nextGameAt > Date.now() : false);

    return (
      <div className="flex flex-col flex-1 w-full min-h-0">
        <CycleStatus
          phase={phase}
          nextSlotTime={nextSlotTime}
          prizeTitle={prizeTitle}
          prizeImageURL={prizeImageURL}
          onPrizeClick={() => {
            if (prizeTitle) setShowPrizeDetail(true);
          }}
        />

        {isMainRoom && (isAutoWaiting || isAutoRecruiting) && (
          <div className="mt-4 mx-4 p-4 bg-surface-base rounded-xl border border-white/[0.06]">
            <p className="text-sm font-semibold text-neon-amber mb-2">
              {isAutoRecruiting ? '🎮 자동 게임 모집 중' : '⏰ 다음 자동 게임'}
            </p>
            {isAutoRecruiting ? (
              <>
                <p className="text-white text-sm mb-2">
                  {autoGame.nextGameName} · 보상: {autoGame.reward?.label ?? '100 포인트'}
                </p>
                <p className="text-white/40 text-xs mb-2">참가 인원: {Object.keys(autoGame.joinedPlayers ?? {}).length}명</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-score tabular-nums text-neon-cyan">{recruitCountdown}초</span>
                  <span className="text-white/30 text-sm">후 시작</span>
                </div>
                {user && (
                  <button onClick={joinAutoGame}
                    className="mt-3 w-full py-2.5 bg-neon-amber/15 border border-neon-amber/25 text-neon-amber font-bold rounded-xl hover:bg-neon-amber/25 active:scale-[0.98] transition-all">
                    참가하기
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-white text-sm">{autoGame?.nextGameName ?? '랜덤 게임'}</p>
                <p className="text-white/30 text-xs mt-1 font-score">
                  {Math.floor(autoCountdown / 60)}분 {autoCountdown % 60}초 후
                </p>
              </>
            )}
          </div>
        )}

        {!hasActiveRegularGame && (
          <div className="flex flex-col items-center justify-center flex-1 py-8 px-4">
            <p className="text-white/30 text-sm mb-4">경품 게임 대기 중이거나 자유 플레이를 즐기세요.</p>
            <button onClick={() => setShowFreePlay(true)}
              className="px-5 py-2.5 bg-neon-magenta/15 border border-neon-magenta/25 text-neon-magenta font-bold rounded-xl hover:bg-neon-magenta/25 active:scale-[0.98] transition-all">
              미니게임 하기
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ── 커스텀방 콘텐츠 ── */
  const renderCustomRoomContent = () => {
    const hasActiveRegularGame =
      activeGame &&
      isGameActivePhase(activeGame.phase) &&
      REGULAR_GAMES.some((g) => g.id === activeGame.gameType);

    if (hasActiveRegularGame && activeGame && user && profile) {
      return <GamePlayingView roomId={roomId} />;
    }

    if (user && profile) {
      return (
        <div className="flex flex-col flex-1 min-h-0">
          <GameContainer roomId={roomId} uid={profile.uid} displayName={profile.displayName || '익명'} photoURL={profile.photoURL} level={profile.level} />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => setShowFreePlay(true)}
              className="px-4 py-2.5 bg-neon-magenta/15 border border-neon-magenta/25 text-neon-magenta font-bold rounded-xl hover:bg-neon-magenta/25 active:scale-[0.98] transition-all">
              미니게임 하기
            </button>
            <button onClick={() => setShowGameLauncher(true)}
              className="px-4 py-2.5 bg-neon-amber/15 border border-neon-amber/25 text-neon-amber font-bold rounded-xl hover:bg-neon-amber/25 active:scale-[0.98] transition-all">
              파티 게임 시작
            </button>
            {(profile.isAdmin || profile.isModerator || activeGame?.startedAt) && (
              <button onClick={() => handleResetGame()}
                className="px-4 py-2.5 bg-surface-elevated border border-white/[0.06] text-white/50 rounded-xl hover:text-white/70 active:scale-[0.98] transition-all">
                게임 초기화
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center flex-1 text-white/30 py-12">
        <p>로그인하면 게임에 참여할 수 있어요.</p>
      </div>
    );
  };

  const handlePasswordSubmit = async (password: string) => {
    try {
      const res = await fetch(`/api/room/${roomId}/verify-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) setPasswordVerified(true); else alert(data.error || '비밀번호가 틀렸습니다');
    } catch { alert('확인 요청 실패'); }
  };

  /* ── 로딩 ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A12] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-magenta" />
      </div>
    );
  }

  /* ── 비밀번호 입력 ── */
  if (roomLocked && !passwordVerified) {
    return (
      <div className="min-h-screen bg-[#0A0A12] text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-xl font-display mb-2">{roomData?.name ?? roomId}</h1>
        <p className="text-white/40 text-sm mb-4">비밀번호를 입력하세요</p>
        <form className="w-full max-w-xs flex flex-col gap-3" onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector<HTMLInputElement>('input[name="password"]');
          if (input?.value) handlePasswordSubmit(input.value);
        }}>
          <input name="password" type="password" placeholder="비밀번호" autoFocus
            className="w-full bg-surface-base border border-white/[0.06] rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-neon-cyan/40 transition-colors" />
          <button type="submit"
            className="w-full py-2.5 bg-neon-cyan/15 border border-neon-cyan/25 text-neon-cyan font-bold rounded-xl hover:bg-neon-cyan/25 transition-all">
            입장
          </button>
        </form>
        <button onClick={() => router.push('/')} className="mt-4 text-white/30 hover:text-white/50 text-sm transition-colors">
          목록으로
        </button>
      </div>
    );
  }

  const roomName = roomData?.name ?? (roomId === 'main' ? '메인' : roomId);

  /* ── 메인 렌더 ── */
  return (
    <div className="h-screen bg-[#0A0A12] text-white flex flex-col overflow-hidden">
      {/* ── 헤더 ── */}
      <header className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.06] bg-surface-base/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.push('/')} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/50" aria-label="뒤로">
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold text-sm truncate">{roomName}</span>
          {profile?.isAdmin && todayVisitors !== null && (
            <span className="px-2 py-0.5 rounded-md bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-[11px] font-score font-medium whitespace-nowrap">
              오늘 {todayVisitors}명
            </span>
          )}
          {isLive && <LiveBadge />}
          <button onClick={() => setShowUserList((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-elevated text-white/50 text-xs">
            <Users size={14} />
            {onlineCount}
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SoundToggle size="sm" />
          {isMainRoom && (
            <button onClick={() => setShowPointShop(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neon-amber/10 border border-neon-amber/20 text-neon-amber text-xs font-score font-medium">
              <ShoppingBag size={14} />
              {userPoints.toLocaleString()}P
            </button>
          )}
          {profile && <LevelBadge level={profile.level} size="sm" />}
        </div>
      </header>

      {/* ── 유저 목록 패널 ── */}
      {showUserList && (
        <div className="shrink-0 border-b border-white/[0.06] bg-surface-base/60 max-h-48 overflow-y-auto">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/40">접속 중 ({onlineUsers.length})</span>
            <button onClick={() => setShowUserList(false)} className="text-white/30 hover:text-white p-1">
              <ChevronUp size={16} />
            </button>
          </div>
          <ul className="px-3 pb-2 space-y-1">
            {onlineUsers.map((u: OnlineUser) => (
              <li key={u.uid} className="flex items-center gap-2 text-sm">
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-surface-elevated" />
                )}
                <span className="truncate text-white/80">{u.displayName}</span>
                <LevelBadge level={u.level} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── 메인 + 채팅 레이아웃 ── */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-auto">
          {isMainRoom ? renderMainRoomContent() : renderCustomRoomContent()}
        </main>

        {/* ── 채팅 ── */}
        <aside className={`shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-white/[0.06] bg-surface-base/50 transition-all ${
          chatCollapsed ? 'h-auto md:h-auto md:w-10' : 'h-80 md:h-auto md:w-72 lg:w-80'
        }`}>
          {chatCollapsed ? (
            <div className="flex flex-col">
              <button onClick={handleChatExpand}
                className="flex items-center justify-center gap-1 py-2 border-b border-white/[0.06] hover:bg-white/[0.04] relative text-white/50">
                <MessageCircle size={18} />
                <span className="text-[10px] text-white/30">채팅</span>
                {unreadCount > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center p-0 text-[10px] bg-neon-magenta border-0">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </button>
              {/* 최신 메시지 2줄 미리보기 */}
              <div onClick={handleChatExpand} className="px-2 py-1.5 cursor-pointer hover:bg-white/[0.02] transition">
                {messages.slice(-2).map((msg, i) => (
                  <p key={i} className="text-[10px] text-white/30 truncate leading-tight">
                    <span className="text-white/50 font-medium">{msg.displayName}:</span> {(msg as { text?: string; message: string }).text ?? msg.message}
                  </p>
                ))}
                {messages.length === 0 && (
                  <p className="text-[10px] text-white/15 text-center">메시지 없음</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-white/[0.06]">
                <span className="text-xs font-semibold text-white/40">채팅</span>
                <button onClick={() => setChatCollapsed(true)} className="p-1 text-white/30 hover:text-white">
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatWindow messages={messages} onSendMessage={sendMessage} currentUid={profile?.uid ?? ''} onKick={handleKick} />
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── 미니게임 모달 (커스텀방에서만) ── */}
      {showFreePlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowFreePlay(false)}>
          <div className="bg-surface-elevated border border-white/[0.06] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">미니게임</h2>
              <button onClick={() => setShowFreePlay(false)} className="p-1 rounded hover:bg-white/[0.06] text-white/50">✕</button>
            </div>
            <FreePlayLobby roomId={roomId} />
          </div>
        </div>
      )}

      {/* ── 정규게임 선택 모달 ── */}
      {showGameLauncher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => { setShowGameLauncher(false); setSelectedGameForLaunch(null); }}>
          <div className="bg-surface-elevated border border-white/[0.06] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            {!selectedGameForLaunch ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">파티 게임 선택</h2>
                  <button onClick={() => setShowGameLauncher(false)} className="p-1 rounded hover:bg-white/[0.06] text-white/50">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {REGULAR_GAMES.map((g) => (
                    <button key={g.id} onClick={() => setSelectedGameForLaunch(g.id)}
                      className="flex items-center gap-2 p-3 rounded-xl bg-surface-base border border-white/[0.06] hover:border-neon-cyan/30 hover:bg-surface-base/80 text-left transition-all active:scale-[0.98]">
                      <span className="text-2xl">{g.emoji}</span>
                      <span className="text-sm font-medium truncate">{g.name}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setSelectedGameForLaunch(null)} className="p-1 rounded hover:bg-white/[0.06] text-white/50">←</button>
                  <h2 className="text-lg font-bold">라운드 선택</h2>
                  <button onClick={() => { setShowGameLauncher(false); setSelectedGameForLaunch(null); }} className="p-1 rounded hover:bg-white/[0.06] text-white/50">✕</button>
                </div>
                <p className="text-center text-white/40 text-sm mb-4">
                  {REGULAR_GAMES.find(g => g.id === selectedGameForLaunch)?.emoji}{' '}
                  {REGULAR_GAMES.find(g => g.id === selectedGameForLaunch)?.name}
                </p>
                <div className="flex justify-center gap-3">
                  {[3, 6, 9].map((r) => (
                    <button
                      key={r}
                      disabled={startingGame}
                      onClick={() => handleStartRegularGame(selectedGameForLaunch, r)}
                      className="flex flex-col items-center gap-1 px-6 py-4 rounded-xl bg-surface-base border border-white/[0.06] hover:border-neon-cyan/30 hover:bg-neon-cyan/5 transition-all disabled:opacity-40 active:scale-[0.98]"
                    >
                      <span className="text-2xl font-black text-neon-cyan">{r}</span>
                      <span className="text-xs text-white/40">라운드</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 경품 상세 모달 ── */}
      {showPrizeDetail && nextPrize.title && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowPrizeDetail(false)}>
          <div className="bg-surface-elevated border border-white/[0.06] rounded-2xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            {nextPrize.imageURL && (
              <img src={nextPrize.imageURL} alt={nextPrize.title}
                className="w-24 h-24 rounded-xl object-cover mx-auto mb-3 border border-neon-amber/30" />
            )}
            <h3 className="text-lg font-bold text-white">{nextPrize.title}</h3>
            {nextPrize.nextSlot && <p className="text-white/40 text-sm mt-1">{nextPrize.nextSlot}</p>}
            <button onClick={() => setShowPrizeDetail(false)}
              className="mt-4 w-full py-2.5 bg-surface-base border border-white/[0.06] hover:bg-white/[0.04] rounded-xl text-white/60 transition-all">
              닫기
            </button>
          </div>
        </div>
      )}

      <PointShop isOpen={showPointShop} onClose={() => setShowPointShop(false)} userPoints={userPoints} uid={profile?.uid ?? ''} />
    </div>
  );
}
