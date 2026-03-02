"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <button onClick={() => router.push("/")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800">
          <ArrowLeft size={18} className="text-gray-400" />
        </button>
        <h1 className="font-bold">알림</h1>
      </header>

      <div className="max-w-md mx-auto p-6 text-center">
        <div className="py-20">
          <Bell size={64} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">알림이 없습니다</h2>
          <p className="text-gray-400 text-sm">당첨 소식, 이벤트 알림 등이 여기에 표시됩니다.</p>
        </div>
      </div>
    </div>
  );
}
