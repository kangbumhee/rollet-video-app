// src/app/admin/schedule/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useSchedule } from '@/hooks/useSchedule';
import { ScheduleCalendar } from '@/components/admin/ScheduleCalendar';
import { TimeSlotGrid } from '@/components/admin/TimeSlotGrid';
import { SlotPrizeAssigner } from '@/components/admin/SlotPrizeAssigner';
import { Badge } from '@/components/ui/badge';
import { getTodayKST } from '@/lib/schedule/slots';
import type { TimeSlot } from '@/types/schedule';

const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID || '';

export default function AdminSchedulePage() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const {
    slots,
    isLoading: scheduleLoading,
    loadDay,
    toggleSlot,
    assignPrize,
    unassignPrize,
    applyPreset,
    error,
  } = useSchedule();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (user.uid !== ADMIN_UID) {
        router.push('/');
        return;
      }
      const today = getTodayKST();
      setSelectedDate(today);
      void loadDay(today);
    }
  }, [loading, user, router, loadDay]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setEditingSlot(null);
    void loadDay(date);
  };

  const handleAssign = async (roomId: string) => {
    if (!editingSlot) return;
    await assignPrize(editingSlot.id, roomId);
    setEditingSlot(null);
  };

  const handleUnassign = async () => {
    if (!editingSlot) return;
    await unassignPrize(editingSlot.id);
    setEditingSlot(null);
  };

  const handleApplyPreset = async (slotTimes: string[]) => {
    if (!selectedDate) return;
    await applyPreset(selectedDate, slotTimes);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-prize-500" />
      </div>
    );
  }

  const enabledSlots = slots.filter((s) => s.enabled);
  const assignedSlots = enabledSlots.filter((s) => s.roomId);

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-gray-400 hover:text-white">
              ←
            </button>
            <h1 className="text-white font-bold">📅 스케줄 관리</h1>
          </div>
          {selectedDate && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                활성 {enabledSlots.length}개
              </Badge>
              <Badge className="bg-green-600 text-white text-xs">배정 {assignedSlots.length}개</Badge>
            </div>
          )}
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">
        <ScheduleCalendar onSelectDate={handleSelectDate} selectedDate={selectedDate} />

        {selectedDate && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">{selectedDate} 스케줄</h2>
              <p className="text-xs text-gray-400">
                {enabledSlots.length}개 활성 / {assignedSlots.length}개 배정
              </p>
            </div>

            {scheduleLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-prize-500" />
              </div>
            ) : (
              <TimeSlotGrid
                date={selectedDate}
                slots={slots}
                onToggle={toggleSlot}
                onSlotClick={setEditingSlot}
                onApplyPreset={handleApplyPreset}
              />
            )}
          </div>
        )}

        {editingSlot && <SlotPrizeAssigner slot={editingSlot} onAssign={handleAssign} onUnassign={handleUnassign} onClose={() => setEditingSlot(null)} />}

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}
