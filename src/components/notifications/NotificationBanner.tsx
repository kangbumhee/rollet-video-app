"use client";

import { useState, useEffect } from "react";
import { onForegroundMessage } from "@/lib/firebase/messaging";

export function NotificationBanner() {
  const [notification, setNotification] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      if (payload.notification) {
        setNotification({
          title: payload.notification.title || "PrizeLive",
          body: payload.notification.body || "",
        });
        setTimeout(() => setNotification(null), 5000);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  if (!notification) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-slide-down
                    bg-gray-900 border border-yellow-500/30 rounded-2xl px-4 py-3
                    shadow-2xl max-w-sm w-full mx-4"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{notification.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{notification.body}</p>
        </div>
        <button onClick={() => setNotification(null)} className="text-gray-500 hover:text-white text-lg leading-none">
          ×
        </button>
      </div>
    </div>
  );
}
