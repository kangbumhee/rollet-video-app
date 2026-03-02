"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import LiveBadge from "@/components/room/LiveBadge";

export default function HomePage() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const goToMainRoom = () => {
    router.push("/room/main");
  };

  const goToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-prize-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎰</span>
          <span className="font-black text-lg gradient-text">PrizeLive</span>
        </div>
        <div>
          {profile ? (
            <button
              onClick={() => router.push("/mypage")}
              className="flex items-center gap-2 bg-gray-800 rounded-full pl-3 pr-1.5 py-1"
            >
              <span className="text-xs text-gray-300">{profile.displayName}</span>
              <img src={profile.photoURL || "/default-avatar.png"} className="w-7 h-7 rounded-full" alt="" />
            </button>
          ) : (
            <button
              onClick={goToLogin}
              className="text-sm text-yellow-400 bg-yellow-500/10
                         border border-yellow-500/30 rounded-full px-4 py-1.5
                         hover:bg-yellow-500/20 transition-colors"
            >
              로그인
            </button>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        {/* 히어로 */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-6 animate-bounce-slow">🎁</div>
          <h1 className="text-3xl font-black mb-3">
            <span className="gradient-text">무료 경품</span>
            <br />
            <span className="text-white">게임으로 받아가세요!</span>
          </h1>
          <p className="text-gray-400 text-sm mt-4 leading-relaxed">
            광고 한 번 보고, 가위바위보 이기면
            <br />
            경품이 당신에게! 24시간 자동 운영
          </p>
        </div>

        {/* 진행 중인 방 */}
        <button
          onClick={goToMainRoom}
          className="w-full max-w-sm bg-gradient-to-br from-yellow-500/20 to-orange-500/20
                     border border-yellow-500/30 rounded-2xl p-5
                     hover:from-yellow-500/30 hover:to-orange-500/30
                     active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <LiveBadge />
            <span className="text-xs text-gray-400">👥 접속 중</span>
          </div>
          <p className="text-left text-lg font-bold text-white group-hover:text-yellow-300 transition-colors">
            🎮 메인 경품방 입장하기
          </p>
          <p className="text-left text-xs text-gray-400 mt-1">지금 바로 참여할 수 있어요</p>
        </button>

        {/* 셀러 방 만들기 */}
        <button
          onClick={() => router.push("/seller/create")}
          className="w-full max-w-sm mt-3 bg-purple-500/10 border border-purple-500/20
                     rounded-2xl p-4 hover:bg-purple-500/20 active:scale-[0.98]
                     transition-all text-left"
        >
          <p className="text-sm font-bold text-purple-300">📦 내 물건으로 경품방 만들기</p>
          <p className="text-xs text-gray-500 mt-1">직접배송 · 위탁배송 · 제품 홍보</p>
        </button>
      </main>

      {/* 하단 */}
      <footer className="py-4 text-center">
        <p className="text-[10px] text-gray-700">© 2026 PrizeLive. All rights reserved.</p>
      </footer>
    </div>
  );
}
