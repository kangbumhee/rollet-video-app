// ============================================
// 파일: src/lib/utils/timezone.ts
// 설명: [보강②] KST(한국표준시) 기준 날짜 유틸
//       모든 일일 제한·연속출석은 KST 기준
// ============================================

/**
 * 현재 KST 날짜를 YYYY-MM-DD 문자열로 반환
 */
export function getTodayKST(): string {
  const now = new Date();
  // UTC+9 = KST
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

/**
 * 주어진 timestamp의 KST 날짜를 YYYY-MM-DD로 반환
 */
export function toKSTDateString(timestamp: number): string {
  const date = new Date(timestamp + 9 * 60 * 60 * 1000);
  return date.toISOString().split("T")[0];
}

/**
 * [보강①] 두 timestamp 간의 KST 날짜 차이 계산
 * 반환: 0(같은 날), 1(연속), 2+(끊김)
 */
export function getKSTDayDifference(timestamp1: number, timestamp2: number): number {
  const date1 = toKSTDateString(timestamp1);
  const date2 = toKSTDateString(timestamp2);

  const d1 = new Date(date1 + "T00:00:00Z");
  const d2 = new Date(date2 + "T00:00:00Z");

  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}
