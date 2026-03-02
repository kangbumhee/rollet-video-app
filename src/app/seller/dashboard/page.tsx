// src/app/seller/dashboard/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { SellerDashboard } from '@/components/seller/SellerDashboard';

export default function SellerDashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-prize-500" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">
            ←
          </button>
          <h1 className="text-white font-bold">판매자 대시보드</h1>
        </div>
      </header>
      <SellerDashboard />
    </div>
  );
}
