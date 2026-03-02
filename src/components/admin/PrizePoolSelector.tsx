// src/components/admin/PrizePoolSelector.tsx
'use client';

import React from 'react';
import type { PrizeRoom } from '@/types/seller';

interface PrizePoolSelectorProps {
  rooms: PrizeRoom[];
  onSelect: (roomId: string) => void;
}

export function PrizePoolSelector({ rooms, onSelect }: PrizePoolSelectorProps) {
  return (
    <div className="space-y-2">
      {rooms.map((room) => (
        <button
          key={room.id}
          onClick={() => onSelect(room.id)}
          className="w-full text-left p-2 rounded-lg bg-gray-800/40 hover:bg-gray-700/50"
        >
          <p className="text-sm text-white">{room.prizeTitle}</p>
          <p className="text-xs text-gray-400">
            {room.deliveryType} · {room.gameType}
          </p>
        </button>
      ))}
    </div>
  );
}
