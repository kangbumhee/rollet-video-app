// ============================================
// 파일: src/lib/room/scheduler.ts
// 설명: [보강⑥] 스케줄 슬롯 관리
//       이미 예약된 슬롯 조회 + 충돌 회피
// ============================================

import { adminFirestore } from "@/lib/firebase/admin";

/**
 * 다음 사용 가능한 30분 슬롯 찾기
 * 이미 APPROVED/LIVE인 방의 scheduledAt와 겹치지 않도록
 *
 * @param minHoursFromNow 최소 N시간 후부터 탐색 (기본 1)
 * @param maxSearch 최대 탐색 슬롯 수 (기본 48 = 24시간)
 */
export async function getNextAvailableSlot(minHoursFromNow: number = 1, maxSearch: number = 48): Promise<Date> {
  const db = adminFirestore;

  // 현재 시간 기준으로 시작점 계산
  const now = new Date();
  const start = new Date(now.getTime() + minHoursFromNow * 60 * 60 * 1000);

  // 30분 단위로 올림
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60, 0, 0);
  if (start.getMinutes() === 60) {
    start.setHours(start.getHours() + 1, 0, 0, 0);
  }

  // 향후 24시간 내 예약된 슬롯 조회
  const endSearch = new Date(start.getTime() + maxSearch * 30 * 60 * 1000);

  const existingRooms = await db
    .collection("rooms")
    .where("status", "in", ["APPROVED", "LIVE"])
    .where("scheduledAt", ">=", start.getTime())
    .where("scheduledAt", "<=", endSearch.getTime())
    .get();

  // 예약된 시간 Set
  const reservedSlots = new Set<number>();
  existingRooms.forEach((doc) => {
    const data = doc.data();
    if (data.scheduledAt) {
      // 30분 단위로 반올림
      const slotTime = Math.round(data.scheduledAt / (30 * 60 * 1000)) * (30 * 60 * 1000);
      reservedSlots.add(slotTime);
    }
  });

  // 빈 슬롯 찾기
  let candidate = new Date(start);
  for (let i = 0; i < maxSearch; i++) {
    const slotTimestamp = candidate.getTime();
    if (!reservedSlots.has(slotTimestamp)) {
      return candidate;
    }
    // 다음 30분 슬롯
    candidate = new Date(candidate.getTime() + 30 * 60 * 1000);
  }

  // 모든 슬롯이 차면 맨 마지막 이후
  return candidate;
}
