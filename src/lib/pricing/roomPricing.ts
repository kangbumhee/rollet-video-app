// ============================================
// 파일: src/lib/pricing/roomPricing.ts
// ============================================

export const ROOM_PRICING = {
  PLATFORM: {
    price: 0,
    entryMethod: "AD" as const,
  },
  SELF_DELIVERY: {
    price: 0,
    entryMethod: "AD" as const,
  },
  CONSIGNMENT: {
    price: 5000,
    entryMethod: "AD" as const,
  },
  SPONSORED: {
    price: 30000,
    entryMethod: "VIDEO" as const,
  },
} as const;
