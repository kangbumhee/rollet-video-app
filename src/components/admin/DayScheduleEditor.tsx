// src/components/admin/DayScheduleEditor.tsx
'use client';

import React from 'react';
import type { TimeSlot } from '@/types/schedule';
import { TimeSlotGrid } from './TimeSlotGrid';

interface DayScheduleEditorProps {
  date: string;
  slots: TimeSlot[];
  onToggle: (slotId: string, enabled: boolean) => void;
  onSlotClick: (slot: TimeSlot) => void;
  onApplyPreset: (slotTimes: string[]) => void;
}

export function DayScheduleEditor(props: DayScheduleEditorProps) {
  return <TimeSlotGrid {...props} />;
}
