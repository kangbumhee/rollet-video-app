// src/app/admin/review/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { PrizeRoom } from '@/types/seller';
import Image from 'next/image';

const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID || '';

export default function AdminReviewPage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const [rooms, setRooms] = useState<PrizeRoom[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && user) {
      if (user.uid !== ADMIN_UID) {
        router.push('/');
        return;
      }
      void loadPendingRooms();
    }
  }, [loading, user, router]);

  const loadPendingRooms = async () => {
    try {
      const res = await apiClient('/api/admin/rooms?status=PENDING_REVIEW');
      const data = (await res.json()) as { success?: boolean; rooms?: PrizeRoom[] };
      if (data.success) {
        setRooms(data.rooms || []);
      }
    } finally {
      setPageLoading(false);
    }
  };

  const handleApprove = async (roomId: string) => {
    setActionLoading(roomId);
    try {
      const res = await apiClient('/api/admin/rooms/approve', {
        method: 'POST',
        body: JSON.stringify({ roomId }),
      });
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (roomId: string) => {
    const reason = rejectReason[roomId];
    if (!reason?.trim()) return;

    setActionLoading(roomId);
    try {
      const res = await apiClient('/api/admin/rooms/reject', {
        method: 'POST',
        body: JSON.stringify({ roomId, reason }),
      });
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-prize-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/')} className="text-gray-400 hover:text-white">
            ←
          </button>
          <h1 className="text-white font-bold">관리자 - 방 심사</h1>
          <Badge variant="outline" className="ml-auto">
            {rooms.length}건 대기
          </Badge>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {rooms.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>심사 대기 중인 방이 없습니다</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-3">
              <div className="flex items-start gap-3">
                {room.prizeImageURL ? (
                  <Image src={room.prizeImageURL} alt="" width={64} height={64} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center text-2xl">🎁</div>
                )}
                <div className="flex-1">
                  <h3 className="text-white font-medium">{room.prizeTitle}</h3>
                  <p className="text-xs text-gray-400">{room.prizeDescription}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {room.deliveryType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {room.gameType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {room.estimatedValue.toLocaleString()}원
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">판매자: {room.ownerName} ({room.ownerId.substring(0, 8)}...)</p>
                  {room.paymentStatus === 'PAID' && (
                    <p className="text-xs text-green-400 mt-1">결제 완료: {room.paymentAmount?.toLocaleString()}원</p>
                  )}
                </div>
              </div>

              {room.videoURL && <video src={room.videoURL} className="w-full aspect-video rounded-lg" controls />}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleApprove(room.id)}
                  disabled={actionLoading === room.id}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  ✅ 승인
                </Button>
                <div className="flex-1 flex gap-1">
                  <Input
                    placeholder="반려 사유"
                    value={rejectReason[room.id] || ''}
                    onChange={(e) => setRejectReason((prev) => ({ ...prev, [room.id]: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white text-xs h-9"
                  />
                  <Button
                    onClick={() => handleReject(room.id)}
                    disabled={actionLoading === room.id || !rejectReason[room.id]?.trim()}
                    variant="destructive"
                    size="sm"
                  >
                    반려
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
