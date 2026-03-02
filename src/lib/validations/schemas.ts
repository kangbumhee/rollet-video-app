// ============================================
// 파일: src/lib/validations/schemas.ts
// 설명: [보강③] 모든 API 요청의 Zod 스키마
//       런타임에서 타입 안전성 보장
// ============================================

import { z } from "zod";

// ── 방 생성 요청 ──
export const CreateRoomSchema = z
  .object({
    deliveryType: z.enum(["SELF_DELIVERY", "CONSIGNMENT", "SPONSORED"]),
    imageURL: z.string().url("유효한 이미지 URL이 필요합니다"),
    videoURL: z.string().url().optional(),
    videoDuration: z.number().min(5, "동영상은 최소 5초 이상").max(120, "동영상은 최대 120초").optional(),
    gameType: z
      .enum([
        "luckyDice",
        "stockRace",
        "highLow",
        "coinBet",
        "horseRace",
        "floorRoulette",
        "goldRush",
        "bombDefuse",
        "tideWave",
        "treasureHunt",
      ])
      .default("luckyDice"),
    title: z.string().max(50, "경품명은 50자 이하").optional(),
    sellerAddress: z.string().max(200).optional(),
    sellerPhone: z.string().regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, "올바른 전화번호 형식이 아닙니다").optional(),
  })
  .refine(
    (data) => {
      // 협찬이면 videoURL 필수
      if (data.deliveryType === "SPONSORED" && !data.videoURL) return false;
      return true;
    },
    { message: "협찬 방은 제품 동영상 URL이 필수입니다", path: ["videoURL"] }
  )
  .refine(
    (data) => {
      // 협찬이면 videoDuration 필수
      if (data.deliveryType === "SPONSORED" && !data.videoDuration) return false;
      return true;
    },
    { message: "협찬 방은 동영상 길이가 필수입니다", path: ["videoDuration"] }
  );

// ── 결제 승인 요청 ──
export const ConfirmPaymentSchema = z.object({
  paymentKey: z.string().min(1, "paymentKey 필수"),
  orderId: z.string().min(1, "orderId 필수"),
  amount: z.number().positive("금액은 양수여야 합니다"),
  roomId: z.string().min(1, "roomId 필수"),
});

// ── 동영상 시청 검증 요청 ──
export const VerifyVideoSchema = z.object({
  roomId: z.string().min(1),
  watchToken: z.string().min(1, "시청 토큰 필수"),
  watchedDuration: z.number().min(0),
});

// ── 배송지 입력 요청 ──
export const ShippingInfoSchema = z.object({
  roomId: z.string().min(1),
  name: z.string().min(1, "이름 필수").max(30),
  phone: z.string().regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, "올바른 전화번호"),
  zipCode: z.string().regex(/^[0-9]{5}$/, "우편번호 5자리"),
  address: z.string().min(1, "주소 필수").max(200),
  addressDetail: z.string().max(100).optional(),
});

// ── 경품 생성 (관리자) ──
export const CreatePrizeSchema = z.object({
  imageURL: z.string().url("유효한 이미지 URL"),
  title: z.string().max(50).optional(),
  gameType: z
    .enum([
      "luckyDice",
      "stockRace",
      "highLow",
      "coinBet",
      "horseRace",
      "floorRoulette",
      "goldRush",
      "bombDefuse",
      "tideWave",
      "treasureHunt",
    ])
    .default("luckyDice"),
  totalQuantity: z.number().int().min(1).max(999).default(1),
});

// ── API 에러 응답 표준 ──
export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

// 타입 추출
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>;
export type VerifyVideoInput = z.infer<typeof VerifyVideoSchema>;
export type ShippingInfoInput = z.infer<typeof ShippingInfoSchema>;
export type CreatePrizeInput = z.infer<typeof CreatePrizeSchema>;
