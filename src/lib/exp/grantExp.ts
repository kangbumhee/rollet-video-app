// ============================================
// 파일: src/lib/exp/grantExp.ts
// 설명: [보강①②] 경험치 지급 시스템
//       - KST 기준 일일 제한
//       - 연속출석: lastVisit 날짜 차이로 정확 계산
//       - Firestore 트랜잭션으로 원자적 처리
// ============================================

import { adminFirestore } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getLevel, EXP_RULES } from "@/lib/utils/level";
import { getTodayKST, getKSTDayDifference } from "@/lib/utils/timezone";

export interface ExpGrantResult {
  success: boolean;
  expGranted: number;
  newTotalExp: number;
  levelUp: boolean;
  newLevel?: number;
  message: string;
  bonuses?: string[];
}

export async function grantExp(
  uid: string,
  action: keyof typeof EXP_RULES,
  metadata?: Record<string, unknown>
): Promise<ExpGrantResult> {
  const db = adminFirestore;
  const todayKST = getTodayKST(); // [보강②] KST 기준
  const userRef = db.doc(`users/${uid}`);
  const dailyRef = db.doc(`users/${uid}/dailyExp/${todayKST}`);

  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new Error("유저 없음");

    const user = userSnap.data()!;
    const dailySnap = await tx.get(dailyRef);
    const daily = dailySnap.exists ? dailySnap.data()! : { chatCount: 0, adCount: 0, totalExp: 0, loginGranted: false };

    let expAmount = EXP_RULES[action] ?? 0;
    const bonuses: string[] = [];

    // ══ 일일 제한 체크 ══
    if (action === "CHAT_MESSAGE") {
      if ((daily.chatCount || 0) >= EXP_RULES.CHAT_DAILY_CAP) {
        return {
          success: false,
          expGranted: 0,
          newTotalExp: user.totalExp || 0,
          levelUp: false,
          message: "오늘 채팅 EXP 한도 도달",
        };
      }
      tx.set(dailyRef, { chatCount: (daily.chatCount || 0) + 1 }, { merge: true });
    }

    if (action === "AD_WATCH") {
      if ((daily.adCount || 0) >= EXP_RULES.AD_DAILY_CAP) {
        return {
          success: false,
          expGranted: 0,
          newTotalExp: user.totalExp || 0,
          levelUp: false,
          message: "오늘 광고 EXP 한도 도달",
        };
      }
      tx.set(dailyRef, { adCount: (daily.adCount || 0) + 1 }, { merge: true });
    }

    // ══ [보강①] 연속출석: lastVisit 날짜 차이 기반 정확 계산 ══
    if (action === "DAILY_LOGIN") {
      if (daily.loginGranted) {
        return {
          success: false,
          expGranted: 0,
          newTotalExp: user.totalExp || 0,
          levelUp: false,
          message: "이미 오늘 로그인 EXP 획득",
        };
      }

      tx.set(dailyRef, { loginGranted: true }, { merge: true });

      const lastVisitTs = user.lastVisit || 0;
      const now = Date.now();
      const dayDiff = getKSTDayDifference(lastVisitTs, now);

      let newConsecutive: number;
      if (dayDiff === 0) {
        // 같은 날 → 변경 없음 (이미 loginGranted로 차단됨)
        newConsecutive = user.consecutiveDays || 1;
      } else if (dayDiff === 1) {
        // 어제 방문 → 연속 +1
        newConsecutive = (user.consecutiveDays || 0) + 1;
      } else {
        // 2일 이상 빠짐 → 연속 초기화
        newConsecutive = 1;
        bonuses.push("⚠️ 연속 출석이 초기화되었습니다");
      }

      // 연속 보너스
      if (newConsecutive > 0 && newConsecutive % 7 === 0) {
        expAmount += EXP_RULES.CONSECUTIVE_7DAYS;
        bonuses.push(`🔥 ${newConsecutive}일 연속! +${EXP_RULES.CONSECUTIVE_7DAYS} 보너스`);
      }
      if (newConsecutive > 0 && newConsecutive % 30 === 0) {
        expAmount += EXP_RULES.CONSECUTIVE_30DAYS;
        bonuses.push(`🏆 ${newConsecutive}일 연속!! +${EXP_RULES.CONSECUTIVE_30DAYS} 보너스`);
      }

      tx.update(userRef, {
        consecutiveDays: newConsecutive,
        lastVisit: now,
      });
    }

    // ══ EXP 지급 ══
    const oldLevel = getLevel(user.totalExp || 0);
    const newTotalExp = (user.totalExp || 0) + expAmount;
    const newLevelInfo = getLevel(newTotalExp);
    const levelUp = newLevelInfo.level > oldLevel.level;

    tx.update(userRef, {
      totalExp: FieldValue.increment(expAmount),
      level: newLevelInfo.level,
    });

    tx.set(dailyRef, { totalExp: (daily.totalExp || 0) + expAmount }, { merge: true });

    // EXP 로그
    const logRef = db.collection(`users/${uid}/expLogs`).doc();
    tx.set(logRef, {
      action,
      expAmount,
      newTotalExp,
      oldLevel: oldLevel.level,
      newLevel: newLevelInfo.level,
      metadata: metadata || {},
      createdAt: Timestamp.now(),
    });

    return {
      success: true,
      expGranted: expAmount,
      newTotalExp,
      levelUp,
      newLevel: levelUp ? newLevelInfo.level : undefined,
      message: levelUp ? `🎉 레벨 업! Lv.${newLevelInfo.level} ${newLevelInfo.title}` : `+${expAmount} EXP`,
      bonuses: bonuses.length > 0 ? bonuses : undefined,
    };
  });
}
