// ============================================
// 파일: src/lib/video/watchToken.ts
// 설명: [보강⑤] HMAC 기반 동영상 시청 토큰
//       클라이언트 우회 방지
// ============================================

import crypto from "crypto";

const SECRET = process.env.OPENAI_API_KEY || "fallback-secret-change-me";
// 실제로는 전용 시크릿 사용. 여기서는 기존 환경변수 재활용

/**
 * 시청 세션 토큰 생성
 * @param uid 유저 ID
 * @param roomId 방 ID
 * @param startTime 세션 시작 시간
 */
export function createWatchToken(uid: string, roomId: string, startTime: number): string {
  const payload = `${uid}:${roomId}:${startTime}`;
  const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${startTime}.${hmac}`;
}

/**
 * 시청 토큰 검증
 * @returns startTime if valid, null if invalid
 */
export function verifyWatchToken(uid: string, roomId: string, token: string): number | null {
  try {
    const [startTimeStr, providedHmac] = token.split(".");
    const startTime = parseInt(startTimeStr, 10);

    if (isNaN(startTime) || !providedHmac) return null;

    const payload = `${uid}:${roomId}:${startTime}`;
    const expectedHmac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

    // 타이밍 안전 비교
    if (
      providedHmac.length !== expectedHmac.length ||
      !crypto.timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac))
    ) {
      return null;
    }

    return startTime;
  } catch {
    return null;
  }
}

/**
 * 시청 시간 충분한지 검증
 * startTime ~ now >= expectedDuration * 0.9
 */
export function isWatchTimeValid(startTime: number, expectedDuration: number, toleranceRatio: number = 0.9): boolean {
  const elapsed = (Date.now() - startTime) / 1000; // 초
  return elapsed >= expectedDuration * toleranceRatio;
}
