// src/components/seller/SellerDashboard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { PrizeRoom, RoomStatus } from '@/types/seller';
import Image from 'next/image';

const STATUS_MAP: Record<RoomStatus, { label: string; color: string }> = {
  DRAFT: { label: '작성 중', color: 'bg-gray-500' },
  PENDING_PAYMENT: { label: '결제 대기', color: 'bg-yellow-500' },
  PENDING_REVIEW: { label: '심사 중', color: 'bg-blue-500' },
  APPROVED: { label: '승인됨', color: 'bg-green-500' },
  SCHEDULED: { label: '스케줄 확정', color: 'bg-purple-500' },
  LIVE: { label: '라이브', color: 'bg-red-500' },
  COMPLETED: { label: '완료', color: 'bg-gray-500' },
  CANCELLED: { label: '취소', color: 'bg-gray-600' },
  REJECTED: { label: '반려', color: 'bg-red-600' },
};

export function SellerDashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<PrizeRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const res = await apiClient('/api/seller/rooms');
      const data = (await res.json()) as { success?: boolean; rooms?: PrizeRoom[] };
      if (data.success) {
        setRooms(data.rooms || []);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-prize-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">내 경품 방</h2>
        <Button onClick={() => router.push('/seller/create')} className="bg-prize-600 hover:bg-prize-700" size="sm">
          + 새 방 개설
        </Button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <span className="text-4xl block mb-3">📦</span>
          <p>아직 개설한 방이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const statusInfo = STATUS_MAP[room.status] || STATUS_MAP.DRAFT;
            return (
              <div key={room.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {room.prizeImageURL ? (
                      <Image src={room.prizeImageURL} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-700 flex items-center justify-center text-2xl">🎁</div>
                    )}
                    <div>
                      <h3 className="text-white font-medium">{room.prizeTitle}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {room.deliveryType} · {room.gameType}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${statusInfo.color} text-white text-xs`}>{statusInfo.label}</Badge>
                </div>

                {room.scheduledSlot && <p className="text-xs text-gray-500 mt-2">📅 {room.scheduledSlot.replace('T', ' ')} KST</p>}
                {room.winnerName && <p className="text-xs text-green-400 mt-1">🏆 당첨자: {room.winnerName}</p>}
                {room.status === 'REJECTED' && room.reviewNote && <p className="text-xs text-red-400 mt-1">사유: {room.reviewNote}</p>}
                {room.shippingInfo && (
                  <p className="text-xs text-blue-400 mt-1">
                    📦 배송: {room.shippingInfo.shippingStatus}
                    {room.shippingInfo.trackingNumber && ` (${room.shippingInfo.trackingNumber})`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
