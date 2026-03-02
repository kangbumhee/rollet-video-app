// src/components/seller/DeliveryTypeSelector.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { DeliveryType } from '@/types/seller';

interface DeliveryTypeSelectorProps {
  selected: DeliveryType | null;
  onSelect: (type: DeliveryType) => void;
}

const OPTIONS: {
  type: DeliveryType;
  icon: string;
  title: string;
  description: string;
  price: string;
  entryLabel: string;
}[] = [
  {
    type: 'SELF_DELIVERY',
    icon: '📦',
    title: '직접 배송',
    description: '당첨자에게 직접 배송합니다',
    price: '무료',
    entryLabel: '광고 시청 입장',
  },
  {
    type: 'CONSIGNMENT',
    icon: '🏪',
    title: '위탁 배송',
    description: '플랫폼에 위탁하여 배송합니다',
    price: '5,000원',
    entryLabel: '광고 시청 입장',
  },
  {
    type: 'SPONSORED',
    icon: '🎬',
    title: '제품 협찬',
    description: '제품 영상을 참가자에게 보여줍니다',
    price: '30,000원',
    entryLabel: '영상 시청 입장',
  },
];

export function DeliveryTypeSelector({ selected, onSelect }: DeliveryTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-300">배송 타입 선택</label>
      <div className="grid gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.type}
            onClick={() => onSelect(opt.type)}
            className={cn(
              'flex items-start gap-4 p-4 rounded-xl border transition-all text-left',
              selected === opt.type
                ? 'border-prize-500 bg-prize-900/20 shadow-lg shadow-prize-500/10'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            )}
          >
            <span className="text-3xl">{opt.icon}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">{opt.title}</h4>
                <span className={cn('text-sm font-bold', opt.price === '무료' ? 'text-green-400' : 'text-yellow-400')}>
                  {opt.price}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{opt.description}</p>
              <p className="text-xs text-gray-500 mt-1">입장 방식: {opt.entryLabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
