// src/types/seller.ts

// ─── 배송 타입 ───
export type DeliveryType =
  | 'SELF_DELIVERY'
  | 'CONSIGNMENT'
  | 'SPONSORED';

// ─── 방 상태 ───
export type RoomStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'LIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

// ─── 입장 방식 ───
export type EntryType = 'AD' | 'VIDEO';

// ─── 방(경품) 정보 ───
export interface PrizeRoom {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerType: 'PLATFORM' | 'SELLER';
  prizeTitle: string;
  prizeDescription: string;
  prizeImageURL: string;
  estimatedValue: number;
  deliveryType: DeliveryType;
  videoURL?: string;
  videoDurationSec?: number;
  entryType: EntryType;
  gameType: string;
  scheduledAt?: number;
  scheduledSlot?: string;
  paymentId?: string;
  paymentAmount?: number;
  paymentStatus?: 'PENDING' | 'PAID' | 'REFUNDED' | 'REFUND_PENDING';
  status: RoomStatus;
  winnerId?: string;
  winnerName?: string;
  shippingInfo?: {
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientZipcode: string;
    trackingNumber?: string;
    trackingCarrier?: string;
    shippingStatus: 'PENDING' | 'SHIPPED' | 'DELIVERED';
  };
  createdAt: number;
  updatedAt: number;
  reviewNote?: string;
}

// ─── 방 생성 요금 ───
export interface RoomPricing {
  deliveryType: DeliveryType;
  price: number;
  entryType: EntryType;
  description: string;
}

// ─── 결제 기록 ───
export interface PaymentRecord {
  id: string;
  roomId: string;
  userId: string;
  amount: number;
  orderId: string;
  paymentKey?: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
  method?: string;
  createdAt: number;
  confirmedAt?: number;
}
