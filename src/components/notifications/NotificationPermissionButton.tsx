"use client";

import { useState } from "react";
import { requestNotificationPermission } from "@/lib/firebase/messaging";
import { useAuthStore } from "@/stores/authStore";
import { Bell, BellOff } from "lucide-react";

export function NotificationPermissionButton() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await requestNotificationPermission();
      if (token) {
        setStatus("granted");
        // TODO: token을 Firestore에 저장 (서버에서 푸시 보낼 때 사용)
      } else {
        setStatus("denied");
      }
    } catch {
      setStatus("denied");
    } finally {
      setLoading(false);
    }
  };

  if (status === "granted") {
    return (
      <button disabled className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm">
        <Bell size={16} /> 알림 ON
      </button>
    );
  }

  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 
                 text-white rounded-xl text-sm transition-colors disabled:opacity-50"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
      ) : status === "denied" ? (
        <BellOff size={16} />
      ) : (
        <Bell size={16} />
      )}
      {status === "denied" ? "알림 차단됨" : "알림 받기"}
    </button>
  );
}
