"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Upload, ClipboardCheck, Package, BarChart3, Settings, CalendarDays, AlertTriangle, Users } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const { profile, loading } = useAuthStore();

  const isAdmin = profile?.isAdmin || false;
  const isModerator = profile?.isModerator || false;

  useEffect(() => {
    if (loading) return;
    if (!isAdmin && !isModerator) {
      router.push('/');
      return;
    }
    if (!isAdmin && isModerator) {
      router.push('/admin/moderation');
      return;
    }
  }, [loading, isAdmin, isModerator, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const MENU_ITEMS = [
    {
      icon: Upload,
      title: "경품 등록",
      desc: "사진 올리면 AI가 자동 처리",
      href: "/admin/upload",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      icon: ClipboardCheck,
      title: "방 검수",
      desc: "셀러 경품방 승인/거절",
      href: "/admin/review",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: Package,
      title: "배송 관리",
      desc: "당첨자 배송 현황",
      href: "/admin/orders",
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      icon: BarChart3,
      title: "통계",
      desc: "접속자·매출·당첨률",
      href: "/admin/stats",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      icon: CalendarDays,
      title: "스케줄 관리",
      desc: "달력 기반 슬롯/경품 배정",
      href: "/admin/schedule",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: AlertTriangle,
      title: "강퇴/채금 이력",
      desc: "제재 현황 확인·해제",
      href: "/admin/moderation",
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      icon: Users,
      title: "매니저 관리",
      desc: "운영자 목록·지정·해제",
      href: "/admin/moderators",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      icon: Settings,
      title: "설정",
      desc: "앱 설정·공지사항",
      href: "/admin/settings",
      color: "text-gray-400",
      bg: "bg-gray-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="px-4 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">🔧 관리자</h1>
        <p className="text-xs text-gray-500 mt-1">{profile?.displayName || "관리자"}</p>
      </header>

      <div className="p-4 space-y-3">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="w-full flex items-center gap-4 p-4 bg-gray-900/50
                       border border-gray-800 rounded-xl
                       hover:bg-gray-800/50 active:scale-[0.98] transition-all text-left"
          >
            <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center`}>
              <item.icon size={22} className={item.color} />
            </div>
            <div>
              <p className="font-bold text-sm">{item.title}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="p-4">
        <button
          onClick={() => router.push("/")}
          className="w-full py-3 text-sm text-gray-500 bg-gray-900
                     rounded-xl hover:text-gray-300 transition-colors"
        >
          ← 메인으로 돌아가기
        </button>
      </div>
    </div>
  );
}
