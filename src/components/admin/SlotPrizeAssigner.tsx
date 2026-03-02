// src/components/admin/SlotPrizeAssigner.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import type { TimeSlot } from '@/types/schedule';

interface RoomItem {
  id: string;
  prizeTitle: string;
  prizeDescription: string;
  prizeImageURL: string;
  estimatedValue: number;
  gameType: string;
  deliveryType: string;
  status: string;
  totalQuantity?: number;
  remainingQuantity?: number;
}

interface SlotPrizeAssignerProps {
  slot: TimeSlot;
  onAssign: (roomId: string) => void;
  onUnassign: () => void;
  onClose: () => void;
}

const GAME_TYPE_LABELS: Record<string, string> = {
  luckyDice: '🎲 운명의 주사위',
  stockRace: '📈 주식 레이스',
  highLow: '🃏 하이 & 로우',
  coinBet: '🪙 코인 베팅',
  horseRace: '🏇 경마 레이스',
  floorRoulette: '🟥 바닥 룰렛',
  goldRush: '⛏️ 골드 러시',
  bombDefuse: '💣 폭탄 해제',
  tideWave: '🌊 파도 서바이벌',
  treasureHunt: '🗺️ 보물찾기',
};

export function SlotPrizeAssigner({ slot, onAssign, onUnassign, onClose }: SlotPrizeAssignerProps) {
  const [availableRooms, setAvailableRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAvailableRooms();
  }, []);

  const loadAvailableRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient('/api/admin/rooms?status=APPROVED');
      const data = (await res.json()) as { success?: boolean; rooms?: RoomItem[]; error?: string };
      if (data.success) {
        setAvailableRooms(data.rooms || []);
      } else {
        setError(data.error || '경품 목록을 불러오지 못했습니다.');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-white font-bold text-sm">
            📅 {slot.date} {slot.time} 슬롯
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* 현재 배정된 경품 */}
          {slot.roomId && (
            <div className="bg-gray-700/50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-2">현재 배정</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {slot.prizeImageURL && (
                    <img src={slot.prizeImageURL} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <p className="text-sm text-white font-medium">{slot.prizeTitle}</p>
                    <p className="text-xs text-gray-400">{slot.gameType}</p>
                  </div>
                </div>
                <button
                  onClick={onUnassign}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium
                             hover:bg-red-500/30 transition-colors"
                >
                  해제
                </button>
              </div>
            </div>
          )}

          {/* 배정 가능한 경품 목록 */}
          <div>
            <p className="text-xs text-gray-400 mb-2">
              배정 가능한 경품 ({availableRooms.length}개)
            </p>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto" />
                <p className="text-xs text-gray-500 mt-2">경품 목록 로딩 중...</p>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-xs text-red-400">{error}</p>
                <button
                  onClick={loadAvailableRooms}
                  className="mt-2 text-xs text-yellow-400 underline"
                >
                  다시 시도
                </button>
              </div>
            ) : availableRooms.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl">📭</span>
                <p className="text-xs text-gray-500 mt-2">
                  배정 가능한 경품이 없습니다.
                  <br />
                  관리자 → 경품 등록에서 먼저 등록하세요.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => onAssign(room.id)}
                    disabled={(room.remainingQuantity ?? 1) <= 0}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left border transition-colors
                      ${(room.remainingQuantity ?? 1) <= 0
                        ? 'bg-gray-700/20 border-gray-700 opacity-40 cursor-not-allowed'
                        : 'bg-gray-700/30 hover:bg-gray-700/60 border-transparent hover:border-yellow-500/30'}`}
                  >
                    {room.prizeImageURL ? (
                      <img src={room.prizeImageURL} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center text-xl">
                        🎁
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{room.prizeTitle}</p>
                      <p className="text-xs text-gray-400">
                        {GAME_TYPE_LABELS[room.gameType] || room.gameType}
                        {room.estimatedValue > 0 ? ` · ${room.estimatedValue.toLocaleString()}원` : ''}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${
                        (room.remainingQuantity ?? 1) > 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}
                    >
                      {(room.remainingQuantity ?? room.totalQuantity ?? 1)}/{room.totalQuantity ?? 1}개
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
