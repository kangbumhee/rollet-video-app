// src/components/admin/SlotPrizeAssigner.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { TimeSlot } from '@/types/schedule';
import type { PrizeRoom } from '@/types/seller';

interface SlotPrizeAssignerProps {
  slot: TimeSlot;
  onAssign: (roomId: string) => void;
  onUnassign: () => void;
  onClose: () => void;
}

export function SlotPrizeAssigner({ slot, onAssign, onUnassign, onClose }: SlotPrizeAssignerProps) {
  const [availableRooms, setAvailableRooms] = useState<PrizeRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAvailableRooms();
  }, []);

  const loadAvailableRooms = async () => {
    try {
      const res = await apiClient('/api/admin/rooms?status=APPROVED');
      const data = (await res.json()) as { success?: boolean; rooms?: PrizeRoom[] };
      if (data.success) {
        setAvailableRooms(data.rooms || []);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium text-sm">
          📅 {slot.date} {slot.time} 슬롯
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">
          ✕
        </button>
      </div>

      {slot.roomId && (
        <div className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {slot.prizeImageURL && <img src={slot.prizeImageURL} alt="" className="w-10 h-10 rounded object-cover" />}
            <div>
              <p className="text-sm text-white">{slot.prizeTitle}</p>
              <p className="text-xs text-gray-400">{slot.gameType}</p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={onUnassign} className="text-xs">
            해제
          </Button>
        </div>
      )}

      <div>
        <p className="text-xs text-gray-400 mb-2">배정 가능한 경품 ({availableRooms.length}개)</p>

        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-prize-500 mx-auto" />
          </div>
        ) : availableRooms.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">배정 가능한 승인된 경품이 없습니다</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {availableRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => onAssign(room.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg bg-gray-700/30 hover:bg-gray-700/60 transition-colors text-left"
              >
                {room.prizeImageURL ? (
                  <img src={room.prizeImageURL} alt="" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-600 flex items-center justify-center">🎁</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{room.prizeTitle}</p>
                  <p className="text-xs text-gray-400">
                    {room.deliveryType} · {room.gameType} · {(room.estimatedValue || 0).toLocaleString()}원
                  </p>
                </div>
                <span className="text-xs text-prize-400">배정</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
