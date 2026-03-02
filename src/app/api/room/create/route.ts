// src/app/api/room/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminFirestore } from '@/lib/firebase/admin';
import { ROOM_PRICING } from '@/lib/payments/toss';
import { generateId } from '@/lib/utils';
import type { PrizeRoom, DeliveryType } from '@/types/seller';

const VALID_DELIVERY_TYPES: DeliveryType[] = ['SELF_DELIVERY', 'CONSIGNMENT', 'SPONSORED'];
const VALID_GAME_TYPES = ['rps', 'roulette', 'oxQuiz', 'numberGuess', 'speedClick'];

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const decoded = await verifyAuth(authHeader.split('Bearer ')[1]);
    if (!decoded) {
      return NextResponse.json({ success: false, error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const body = (await req.json()) as {
      prizeTitle?: string;
      prizeDescription?: string;
      prizeImageURL?: string;
      estimatedValue?: number;
      deliveryType?: DeliveryType;
      gameType?: string;
      videoURL?: string;
      videoDurationSec?: number;
    };

    const { prizeTitle, prizeDescription, prizeImageURL, estimatedValue, deliveryType, gameType, videoURL, videoDurationSec } =
      body;

    if (!prizeTitle || typeof prizeTitle !== 'string' || prizeTitle.trim().length < 2) {
      return NextResponse.json({ success: false, error: '경품 이름을 2자 이상 입력하세요.' }, { status: 400 });
    }

    if (!deliveryType || !VALID_DELIVERY_TYPES.includes(deliveryType)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 배송 타입입니다.' }, { status: 400 });
    }

    if (!gameType || !VALID_GAME_TYPES.includes(gameType)) {
      return NextResponse.json({ success: false, error: '유효하지 않은 게임 타입입니다.' }, { status: 400 });
    }

    if (deliveryType === 'SPONSORED' && !videoURL) {
      return NextResponse.json({ success: false, error: '협찬 타입은 영상 URL이 필수입니다.' }, { status: 400 });
    }

    if (typeof estimatedValue !== 'number' || estimatedValue <= 0) {
      return NextResponse.json({ success: false, error: '예상 가치를 올바르게 입력하세요.' }, { status: 400 });
    }

    const userDoc = await adminFirestore.doc(`users/${decoded.uid}`).get();
    const userData = userDoc.data();

    const pricing = ROOM_PRICING[deliveryType];
    const entryType = pricing?.entryType || 'AD';
    const paymentAmount = pricing?.price || 0;

    const roomId = generateId();
    const now = Date.now();

    const room: PrizeRoom = {
      id: roomId,
      ownerId: decoded.uid,
      ownerName: (userData?.displayName as string) || '판매자',
      ownerType: decoded.uid === process.env.ADMIN_UID ? 'PLATFORM' : 'SELLER',
      prizeTitle: prizeTitle.trim(),
      prizeDescription: prizeDescription?.trim() || '',
      prizeImageURL: prizeImageURL || '',
      estimatedValue,
      deliveryType,
      entryType,
      gameType,
      status: paymentAmount > 0 ? 'PENDING_PAYMENT' : 'PENDING_REVIEW',
      createdAt: now,
      updatedAt: now,
    };

    if (deliveryType === 'SPONSORED') {
      room.videoURL = videoURL;
      room.videoDurationSec = videoDurationSec || 0;
    }

    await adminFirestore.doc(`prizeRooms/${roomId}`).set(room);

    if (paymentAmount > 0) {
      const orderId = `ROOM_${roomId}_${now}`;

      await adminFirestore.doc(`payments/${orderId}`).set({
        id: orderId,
        roomId,
        userId: decoded.uid,
        amount: paymentAmount,
        orderId,
        status: 'PENDING',
        createdAt: now,
      });

      return NextResponse.json({
        success: true,
        roomId,
        requiresPayment: true,
        paymentAmount,
        orderId,
        orderName: `경품방 개설 - ${deliveryType === 'CONSIGNMENT' ? '위탁배송' : '협찬'}`,
      });
    }

    return NextResponse.json({
      success: true,
      roomId,
      requiresPayment: false,
      status: room.status,
    });
  } catch (error) {
    console.error('Room create error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
