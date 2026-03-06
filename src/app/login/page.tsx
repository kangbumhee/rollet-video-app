// ============================================
// 파일: src/app/login/page.tsx
// 설명: 로그인 페이지 — PartyPlay 네온 아케이드 디자인
// ============================================

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { profile, loading, signInWithGoogle } = useAuthStore();
  const [isKakaoInApp, setIsKakaoInApp] = useState(false);

  useEffect(() => {
    if (profile && !loading) {
      router.push(redirectTo);
    }
  }, [profile, loading, router, redirectTo]);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/KAKAOTALK|Instagram|FBAN|FBAV|LINE/i.test(ua)) {
      setIsKakaoInApp(true);

      if (/Android/i.test(ua)) {
        const url = window.location.href;
        window.location.href =
          "intent://" +
          url.replace(/https?:\/\//, "") +
          "#Intent;scheme=https;package=com.android.chrome;end";
        return;
      }

      if (/iPhone|iPad/i.test(ua)) {
        const chromeUrl = window.location.href.replace(/^https:\/\//, "googlechromes://");
        window.location.href = chromeUrl || window.location.href;
      }
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      router.push(redirectTo);
    } catch (error) {
      console.error("로그인 실패:", error);
    }
  };

  // ── 인앱 브라우저 안내 화면 ──
  if (isKakaoInApp) {
    const copyUrl = () => {
      void navigator.clipboard.writeText(window.location.href);
      alert("링크가 복사되었습니다. 브라우저에 붙여넣기 해주세요!");
    };

    return (
      <div className="min-h-screen bg-[#0A0A12] flex flex-col items-center justify-center px-6 text-center relative">
        {/* 배경 글로우 */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,45,120,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="text-5xl mb-6">🌐</div>
          <h1 className="text-white text-xl font-display mb-3">
            외부 브라우저에서 열어주세요
          </h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            카카오톡 내 브라우저에서는 Google 로그인이
            <br />
            지원되지 않습니다.
          </p>

          <button
            onClick={() => {
              const url = window.location.href;
              window.location.href =
                "intent://" +
                url.replace(/https?:\/\//, "") +
                "#Intent;scheme=https;package=com.android.chrome;end";
            }}
            className="w-full max-w-xs py-3.5 bg-[rgba(255,45,120,0.15)] border border-[rgba(255,45,120,0.25)] text-[#FF2D78] rounded-2xl font-bold text-sm mb-3 hover:bg-[rgba(255,45,120,0.25)] active:scale-[0.98] transition-all"
          >
            Chrome으로 열기
          </button>

          <button
            onClick={copyUrl}
            className="w-full max-w-xs py-3.5 bg-[#11111C] border border-[rgba(255,255,255,0.06)] text-white/50 rounded-2xl font-bold text-sm mb-8 hover:text-white/70 active:scale-[0.98] transition-all"
          >
            링크 복사하기
          </button>

          <div className="bg-[#11111C] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 max-w-xs mx-auto">
            <p className="text-white/30 text-xs leading-relaxed">
              <strong className="text-white/50">방법:</strong> 오른쪽 상단
              <span className="text-[#00E5FF]"> ⋮ </span>→
              <span className="text-[#00E5FF]"> 다른 브라우저로 열기</span>를 눌러주세요
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── 메인 로그인 화면 ──
  return (
    <div className="min-h-screen bg-[#0A0A12] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* 배경 네온 글로우 */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,45,120,0.1)_0%,rgba(0,229,255,0.05)_50%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[radial-gradient(ellipse,rgba(139,92,246,0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* 로고 영역 */}
        <div className="text-center mb-12">
          <div
            className="w-20 h-20 rounded-2xl bg-[rgba(255,45,120,0.1)] border border-[rgba(255,45,120,0.2)] flex items-center justify-center mx-auto mb-5"
            style={{
              boxShadow:
                "0 0 20px rgba(255,45,120,0.15), 0 0 40px rgba(255,45,120,0.05)",
            }}
          >
            <span className="text-4xl">🎮</span>
          </div>
          <h1
            className="text-3xl font-display tracking-tight mb-2"
            style={{
              color: "#FF2D78",
              textShadow: "0 0 20px rgba(255,45,120,0.4)",
            }}
          >
            PartyPlay
          </h1>
          <p className="text-white/35 text-sm">실시간 파티게임</p>
        </div>

        {/* 로그인 버튼들 */}
        <div className="w-full max-w-sm flex flex-col gap-3">
          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4
                       bg-white text-gray-900 rounded-2xl font-medium text-sm
                       hover:shadow-[0_0_20px_rgba(0,229,255,0.15)] active:scale-[0.98] transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
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

          {/* 카카오 (준비중) */}
          <button
            disabled
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4
                       bg-[#FEE500] text-[#191919] rounded-2xl font-medium text-sm
                       opacity-40 cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.15a.37.37 0 0 0 .56.4l4.94-3.26c.4.04.82.06 1.24.06 5.52 0 10-3.36 10-7.59S17.52 3 12 3z" />
            </svg>
            <span>카카오로 시작하기 (준비중)</span>
          </button>

          {/* 네이버 (준비중) */}
          <button
            disabled
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4
                       bg-[#03C75A] text-white rounded-2xl font-medium text-sm
                       opacity-40 cursor-not-allowed"
          >
            <span className="font-black text-lg">N</span>
            <span>네이버로 시작하기 (준비중)</span>
          </button>
        </div>

        {/* 하단 안내 */}
        <p className="text-white/15 text-xs mt-8 text-center">
          로그인 시{" "}
          <span className="underline cursor-pointer text-white/25 hover:text-white/40 transition-colors">
            이용약관
          </span>{" "}
          및{" "}
          <span className="underline cursor-pointer text-white/25 hover:text-white/40 transition-colors">
            개인정보처리방침
          </span>
          에 동의합니다.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A12] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-neon-magenta border-t-transparent" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
