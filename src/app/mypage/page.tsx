"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { LevelBadge } from "@/components/user/LevelBadge";
import { NotificationPermissionButton } from "@/components/notifications/NotificationPermissionButton";
import Image from "next/image";

export default function MyPage() {
  const router = useRouter();
  const { profile, signOutUser, loading } = useAuthStore();

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

  const isAdmin = profile.uid === process.env.NEXT_PUBLIC_ADMIN_UID;

  const statItems = [
    { label: "레벨", value: profile.level, icon: "⭐" },
    { label: "경험치", value: profile.totalExp.toLocaleString(), icon: "✨" },
    { label: "티켓", value: profile.tickets, icon: "🎫" },
    { label: "총 게임", value: profile.totalGames, icon: "🎮" },
    { label: "총 승리", value: profile.totalWins, icon: "🏆" },
    { label: "연속 출석", value: `${profile.consecutiveDays}일`, icon: "🔥" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E]">
        <button
          onClick={() => router.push("/")}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← 뒤로
        </button>
        <h1 className="font-bold">마이페이지</h1>
        <div className="w-10" />
      </header>

      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Image
              src={profile.photoURL || "/default-avatar.png"}
              alt={profile.displayName}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full border-2 border-yellow-500/30"
            />
            <div className="absolute -bottom-1 -right-1">
              <LevelBadge level={profile.level} size="sm" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold">{profile.displayName}</h2>
            <p className="text-xs text-gray-500">{profile.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-3 text-center"
            >
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-sm font-bold text-white">{item.value}</div>
              <div className="text-[10px] text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => router.push("/shop")}
            className="w-full flex items-center gap-3 p-4 bg-[#111118] border border-[#1E1E2E] rounded-xl hover:bg-gray-800/50 transition-all text-left"
          >
            <span className="text-lg">🛒</span>
            <div>
              <p className="font-medium text-sm">상점</p>
              <p className="text-xs text-gray-500">티켓·부스트·뱃지 구매</p>
            </div>
          </button>

          <button
            onClick={() => router.push("/notifications")}
            className="w-full flex items-center gap-3 p-4 bg-[#111118] border border-[#1E1E2E] rounded-xl hover:bg-gray-800/50 transition-all text-left"
          >
            <span className="text-lg">🔔</span>
            <div>
              <p className="font-medium text-sm">알림</p>
              <p className="text-xs text-gray-500">당첨·시스템 알림</p>
            </div>
          </button>

          {isAdmin && (
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
          )}
        </div>

        <NotificationPermissionButton />

        <button
          onClick={handleSignOut}
          className="w-full py-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
