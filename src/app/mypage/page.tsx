"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { LevelBadge } from "@/components/user/LevelBadge";
import { NotificationPermissionButton } from "@/components/notifications/NotificationPermissionButton";
import { firestore, realtimeDb } from "@/lib/firebase/config";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { get, ref } from "firebase/database";
import Image from "next/image";

interface WinRecord {
  id: string;
  prizeTitle: string;
  wonAt: number;
  gameType: string;
}

interface MiniGameRecord {
  gameId: string;
  gameName: string;
  score: number;
  scoreLabel: string;
  isHolder: boolean;
}

const MINI_GAME_NAMES: Record<string, string> = {
  coinflip: "🪙 동전 던지기",
  dice: "🎲 주사위",
  slot: "🎰 슬롯머신",
  memory: "🧠 기억력",
  reaction: "⚡ 반응속도",
  typing: "⌨️ 타자",
  quiz: "📝 퀴즈",
  baseball: "⚾ 숫자야구",
  mole: "🔨 두더지",
  updown: "🔢 업다운",
  colormatch: "🎨 색맞추기",
  rspspeed: "✊ 가위바위보",
  math: "🧮 암산",
  wordchain: "💬 끝말잇기",
  simon: "🔴 사이먼",
  bomb: "💣 폭탄",
  oddoneout: "👀 다른그림",
  speedcalc: "➕ 빠른계산",
  emojiquiz: "😎 이모지퀴즈",
  stacktower: "🏗️ 탑쌓기",
};

export default function MyPage() {
  const router = useRouter();
  const { profile, signOutUser, loading } = useAuthStore();
  const [wins, setWins] = useState<WinRecord[]>([]);
  const [miniRecords, setMiniRecords] = useState<MiniGameRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"stats" | "wins" | "records">("stats");

  const isAdmin = profile?.isAdmin || profile?.isModerator || false;

  // 당첨 내역 로드
  useEffect(() => {
    if (!profile) return;
    const loadWins = async () => {
      try {
        const q = query(
          collection(firestore, "winners"),
          where("uid", "==", profile.uid),
          orderBy("wonAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        setWins(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WinRecord)));
      } catch {
        // winners 컬렉션이 없을 수 있음
      }
    };
    void loadWins();
  }, [profile]);

  // 미니게임 신기록 로드
  useEffect(() => {
    if (!profile) return;
    const loadRecords = async () => {
      try {
        const snap = await get(ref(realtimeDb, "miniGameRecords"));
        if (!snap.exists()) return;
        const data = snap.val() as Record<string, { score: number; scoreLabel?: string; holder: string; holderId: string }>;
        const records: MiniGameRecord[] = Object.entries(data).map(([gameId, rec]) => ({
          gameId,
          gameName: MINI_GAME_NAMES[gameId] || gameId,
          score: rec.score,
          scoreLabel: rec.scoreLabel || String(rec.score),
          isHolder: rec.holderId === profile.uid,
        }));
        // 내가 보유한 기록 우선, 나머지는 이름순
        records.sort((a, b) => (a.isHolder === b.isHolder ? 0 : a.isHolder ? -1 : 1));
        setMiniRecords(records);
      } catch {}
    };
    void loadRecords();
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (!profile) {
    router.push("/login");
    return null;
  }

  const handleSignOut = async () => {
    await signOutUser();
    router.push("/");
  };

  const statItems = [
    { label: "레벨", value: profile.level, icon: "⭐" },
    { label: "경험치", value: profile.totalExp.toLocaleString(), icon: "✨" },
    { label: "티켓", value: profile.tickets, icon: "🎫" },
    { label: "총 게임", value: profile.totalGames, icon: "🎮" },
    { label: "총 승리", value: profile.totalWins, icon: "🏆" },
    { label: "연속 출석", value: `${profile.consecutiveDays}일`, icon: "🔥" },
  ];

  const myRecordCount = miniRecords.filter((r) => r.isHolder).length;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E]">
        <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white text-sm">
          ← 뒤로
        </button>
        <h1 className="font-bold">마이페이지</h1>
        <div className="w-10" />
      </header>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* 프로필 */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Image src={profile.photoURL || "/default-avatar.png"} alt={profile.displayName} width={80} height={80} className="w-20 h-20 rounded-full border-2 border-yellow-500/30" />
            <div className="absolute -bottom-1 -right-1"><LevelBadge level={profile.level} size="sm" /></div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold">{profile.displayName}</h2>
            <p className="text-xs text-gray-500">{profile.email}</p>
            {myRecordCount > 0 && (
              <p className="text-yellow-400 text-xs mt-1 font-bold">🏆 신기록 {myRecordCount}개 보유!</p>
            )}
          </div>
        </div>

        {/* 탭 */}
        <div className="flex bg-[#111118] rounded-xl p-1">
          {[
            { id: "stats" as const, label: "📊 통계" },
            { id: "wins" as const, label: "🏆 당첨" },
            { id: "records" as const, label: "🎮 기록" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                activeTab === tab.id ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 통계 탭 */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-3 gap-3">
            {statItems.map((item) => (
              <div key={item.label} className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-3 text-center">
                <div className="text-lg mb-1">{item.icon}</div>
                <div className="text-sm font-bold text-white">{item.value}</div>
                <div className="text-[10px] text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 당첨 탭 */}
        {activeTab === "wins" && (
          <div className="space-y-2">
            {wins.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-2">🎯</p>
                <p className="text-gray-400 text-sm">아직 당첨 내역이 없습니다</p>
                <p className="text-gray-600 text-xs mt-1">게임에 참여해서 경품을 받아보세요!</p>
              </div>
            ) : (
              wins.map((w) => (
                <div key={w.id} className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-3 flex items-center gap-3">
                  <div className="text-2xl">🎁</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{w.prizeTitle}</p>
                    <p className="text-[10px] text-gray-500">{new Date(w.wonAt).toLocaleDateString("ko-KR")}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 미니게임 기록 탭 */}
        {activeTab === "records" && (
          <div className="space-y-2">
            {miniRecords.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-2">🎮</p>
                <p className="text-gray-400 text-sm">미니게임 기록이 없습니다</p>
              </div>
            ) : (
              miniRecords.map((r) => (
                <div key={r.gameId} className={`bg-[#111118] border rounded-xl p-3 flex items-center justify-between ${
                  r.isHolder ? "border-yellow-500/30" : "border-[#1E1E2E]"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{r.gameName}</span>
                    {r.isHolder && <span className="text-yellow-400 text-[10px] font-bold bg-yellow-400/10 px-1.5 py-0.5 rounded-full">내 기록!</span>}
                  </div>
                  <span className="text-xs text-gray-300 font-mono">{r.scoreLabel}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* 메뉴 */}
        <div className="space-y-2 pt-2">
          {isAdmin && (
            <>
              <button
                onClick={() => router.push("/admin")}
                className="w-full flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/20 transition-all text-left"
              >
                <span className="text-lg">🔧</span>
                <div>
                  <p className="font-medium text-sm text-yellow-400">관리자 페이지</p>
                  <p className="text-xs text-gray-500">경품 등록·스케줄·검수</p>
                </div>
              </button>

              <button
                onClick={() => router.push("/admin/moderation")}
                className="w-full flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-left"
              >
                <span className="text-lg">🚨</span>
                <div>
                  <p className="font-medium text-sm text-red-400">강퇴/채금 이력</p>
                  <p className="text-xs text-gray-500">제재 기록 조회·관리</p>
                </div>
              </button>
            </>
          )}
        </div>

        <NotificationPermissionButton />

        <button
          onClick={() => void handleSignOut()}
          className="w-full py-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
