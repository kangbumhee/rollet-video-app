// ============================================
// 파일: src/app/login/page.tsx
// 설명: 로그인 페이지 (Google만 우선 구현)
// ============================================

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { profile, loading, signInWithGoogle } = useAuthStore();

  // 이미 로그인 되어 있으면 메인으로
  useEffect(() => {
    if (profile && !loading) {
      router.push("/");
    }
  }, [profile, loading, router]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (error) {
      console.error("로그인 실패:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center px-6">
      {/* 로고 영역 */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🎰</div>
        <h1 className="text-3xl font-black gradient-text mb-2">PrizeLive</h1>
        <p className="text-gray-400 text-sm">24시간 라이브 경품 게임</p>
      </div>

      {/* 로그인 버튼들 */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4
                     bg-white text-gray-900 rounded-xl font-medium text-sm
                     hover:bg-gray-100 active:scale-[0.98] transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Google로 시작하기</span>
        </button>

        {/* 카카오 (추후 구현 - UI만) */}
        <button
          disabled
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4
                     bg-[#FEE500] text-[#191919] rounded-xl font-medium text-sm
                     opacity-50 cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
            <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.15a.37.37 0 0 0 .56.4l4.94-3.26c.4.04.82.06 1.24.06 5.52 0 10-3.36 10-7.59S17.52 3 12 3z" />
          </svg>
          <span>카카오로 시작하기 (준비중)</span>
        </button>

        {/* 네이버 (추후 구현 - UI만) */}
        <button
          disabled
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4
                     bg-[#03C75A] text-white rounded-xl font-medium text-sm
                     opacity-50 cursor-not-allowed"
        >
          <span className="font-black text-lg">N</span>
          <span>네이버로 시작하기 (준비중)</span>
        </button>
      </div>

      {/* 하단 안내 */}
      <p className="text-gray-600 text-xs mt-8 text-center">
        로그인 시 <span className="underline cursor-pointer">이용약관</span> 및{" "}
        <span className="underline cursor-pointer">개인정보처리방침</span>에 동의합니다.
      </p>
    </div>
  );
}
