// ============================================
// 파일: src/components/providers/AuthProvider.tsx
// 설명: 앱 전체를 감싸는 인증 프로바이더
// ============================================

"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    const unsubscribe = init();
    return () => unsubscribe();
  }, [init]);

  return <>{children}</>;
}
