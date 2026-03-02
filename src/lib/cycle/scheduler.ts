// src/lib/cycle/scheduler.ts
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/config';
import type { PrizeRoom } from '@/types/seller';

const KST_OFFSET = 9 * 60 * 60 * 1000;

export function toKST(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET);
}

export function nowKST(): Date {
  return toKST(new Date());
}

export function getNextSlot(fromDate?: Date): { slot: string; startTime: number } {
  const now = fromDate || new Date();
  const kst = toKST(now);

  const year = kst.getFullYear();
  const month = String(kst.getMonth() + 1).padStart(2, '0');
  const day = String(kst.getDate()).padStart(2, '0');
  const hours = kst.getHours();
  const minutes = kst.getMinutes();

  let slotMinute: number;
  let slotHour = hours;

  if (minutes < 30) {
    slotMinute = 30;
  } else {
    slotMinute = 0;
    slotHour = hours + 1;
    if (slotHour >= 24) {
      slotHour = 0;
    }
  }

  const slot = `${year}-${month}-${day}T${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;
  const slotKST = new Date(`${slot}:00+09:00`);
  const startTime = slotKST.getTime();

  return { slot, startTime };
}

export async function isSlotOccupied(slot: string): Promise<boolean> {
  const q = query(
    collection(firestore, 'prizeRooms'),
    where('scheduledSlot', '==', slot),
    where('status', 'in', ['SCHEDULED', 'LIVE']),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function getNextAvailableSlot(): Promise<{ slot: string; startTime: number }> {
  let candidate = getNextSlot();
  let attempts = 0;
  const MAX_ATTEMPTS = 48;

  while (attempts < MAX_ATTEMPTS) {
    const occupied = await isSlotOccupied(candidate.slot);
    if (!occupied) return candidate;

    const nextDate = new Date(candidate.startTime + 30 * 60 * 1000 - KST_OFFSET);
    candidate = getNextSlot(nextDate);
    attempts++;
  }

  return candidate;
}

export async function getNextScheduledRoom(): Promise<PrizeRoom | null> {
  const now = Date.now();
  const q = query(
    collection(firestore, 'prizeRooms'),
    where('status', '==', 'SCHEDULED'),
    where('scheduledAt', '<=', now + 60 * 1000),
    orderBy('scheduledAt', 'asc'),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return { id: snap.docs[0].id, ...snap.docs[0].data() } as PrizeRoom;
}

export function getTodayCycleIndex(): number {
  const kst = nowKST();
  const hours = kst.getHours();
  const minutes = kst.getMinutes();
  return hours * 2 + (minutes >= 30 ? 1 : 0);
}
