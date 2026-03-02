// ============================================
// 파일: src/lib/utils/level.ts
// 설명: 레벨·경험치 시스템
//       만렙 Lv.50 = 2년(730일) 매일 참석
//       공식: 누적EXP = floor(50 * level^2.3)
// ============================================

export const MAX_LEVEL = 50;

export interface LevelInfo {
  level: number;
  requiredTotalExp: number;
  requiredExp: number;
  badge: string;
  title: string;
  color: string;
}

const BADGE_MAP: Record<number, { badge: string; title: string; color: string }> = {
  1: { badge: "🥚", title: "알", color: "text-gray-400" },
  2: { badge: "🐣", title: "병아리", color: "text-gray-300" },
  3: { badge: "🌱", title: "새싹", color: "text-green-400" },
  5: { badge: "🌿", title: "풀잎", color: "text-green-500" },
  7: { badge: "🍀", title: "클로버", color: "text-emerald-400" },
  10: { badge: "⭐", title: "별", color: "text-yellow-400" },
  15: { badge: "🔥", title: "불꽃", color: "text-orange-400" },
  20: { badge: "🏆", title: "챔피언", color: "text-amber-400" },
  25: { badge: "👑", title: "왕", color: "text-purple-400" },
  30: { badge: "🐉", title: "드래곤", color: "text-red-400" },
  40: { badge: "⚡", title: "썬더", color: "text-blue-400" },
  50: { badge: "🏅", title: "레전드", color: "text-yellow-300" },
};

function getBadge(level: number) {
  let result = BADGE_MAP[1];
  for (const key of Object.keys(BADGE_MAP).map(Number).sort((a, b) => a - b)) {
    if (key <= level) result = BADGE_MAP[key];
  }
  return result;
}

// 레벨 테이블 생성
const _table: LevelInfo[] = [];
let _prev = 0;
for (let lv = 1; lv <= MAX_LEVEL; lv++) {
  const total = lv === 1 ? 0 : Math.floor(50 * Math.pow(lv, 2.3));
  const meta = getBadge(lv);
  _table.push({
    level: lv,
    requiredTotalExp: total,
    requiredExp: total - _prev,
    ...meta,
  });
  _prev = total;
}

export const LEVEL_TABLE = _table;

export function getLevel(totalExp: number): LevelInfo {
  for (let i = LEVEL_TABLE.length - 1; i >= 0; i--) {
    if (totalExp >= LEVEL_TABLE[i].requiredTotalExp) return LEVEL_TABLE[i];
  }
  return LEVEL_TABLE[0];
}

export function getLevelProgress(totalExp: number): number {
  const current = getLevel(totalExp);
  if (current.level >= MAX_LEVEL) return 100;
  const next = LEVEL_TABLE[current.level];
  const needed = next.requiredTotalExp - current.requiredTotalExp;
  const have = totalExp - current.requiredTotalExp;
  return Math.min(100, Math.floor((have / needed) * 100));
}

export const EXP_RULES = {
  DAILY_LOGIN: 15,
  CONSECUTIVE_7DAYS: 50,
  CONSECUTIVE_30DAYS: 200,
  WATCH_PER_5MIN: 2,
  CHAT_MESSAGE: 1,
  CHAT_DAILY_CAP: 30,
  GAME_PARTICIPATE: 10,
  GAME_WIN: 30,
  AD_WATCH: 3,
  AD_DAILY_CAP: 5,
  VIDEO_WATCH: 5,
  INVITE_FRIEND: 20,
  FIRST_WIN: 50,
} as const;
