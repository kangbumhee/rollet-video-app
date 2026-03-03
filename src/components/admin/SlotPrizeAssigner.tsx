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

const PRIZE_GAME_TYPES = [
  { id: 'drawGuess', label: '🎨 그림 맞추기' },
  { id: 'typingBattle', label: '⌨️ 타이핑 배틀' },
  { id: 'bombPass', label: '💣 폭탄 돌리기' },
  { id: 'priceGuess', label: '💰 가격 맞추기' },
  { id: 'oxSurvival', label: '⭕ OX 서바이벌' },
  { id: 'tapSurvival', label: '👆 탭 서바이벌' },
  { id: 'nunchiGame', label: '👀 눈치 게임' },
  { id: 'quickTouch', label: '🎯 순발력 터치' },
  { id: 'lineRunner', label: '✏️ 라인 러너' },
  { id: 'liarVote', label: '🕵️ 라이어 투표' },
];

export function SlotPrizeAssigner({ slot, onAssign, onUnassign, onClose }: SlotPrizeAssignerProps) {
  const [availableRooms, setAvailableRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<string>(slot.gameType || '');
  const [changingGameType, setChangingGameType] = useState(false);

  useEffect(() => {
    void loadAvailableRooms();
  }, []);

  useEffect(() => {
    setSelectedGameType(slot.gameType || '');
  }, [slot.gameType]);

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
              <div className="mt-3 pt-3 border-t border-gray-600/50">
                <p className="text-xs text-gray-400 mb-1.5">🎮 게임 타입 변경</p>
                <div className="flex gap-2">
                  <select
                    value={selectedGameType}
                    onChange={(e) => setSelectedGameType(e.target.value)}
                    className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 border border-gray-600 outline-none focus:border-purple-500"
                  >
                    <option value="">선택...</option>
                    {PRIZE_GAME_TYPES.map((g) => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      if (!selectedGameType) return;
                      setChangingGameType(true);
                      try {
                        await apiClient('/api/admin/schedule/change-game-type', {
                          method: 'POST',
                          body: JSON.stringify({ slotId: slot.id, gameType: selectedGameType }),
                        });
                        alert('게임 타입이 변경되었습니다');
                        onClose();
                      } catch {
                        alert('변경 실패');
                      } finally {
                        setChangingGameType(false);
                      }
                    }}
                    disabled={!selectedGameType || changingGameType}
                    className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-500 disabled:opacity-40 transition shrink-0"
                  >
                    {changingGameType ? '...' : '변경'}
                  </button>
                </div>
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
