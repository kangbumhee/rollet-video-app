// src/app/api/room/payment/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminFirestore } from '@/lib/firebase/admin';
import { confirmPayment } from '@/lib/payments/toss';

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

    const { paymentKey, orderId, amount } = (await req.json()) as {
      paymentKey?: string;
      orderId?: string;
      amount?: number;
    };

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json({ success: false, error: '결제 정보가 부족합니다.' }, { status: 400 });
    }

    const paymentDoc = await adminFirestore.doc(`payments/${orderId}`).get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ success: false, error: '결제 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const paymentData = paymentDoc.data() as { amount: number; userId: string; status: string; roomId: string };
    if (paymentData.amount !== amount) {
      return NextResponse.json({ success: false, error: '결제 금액이 일치하지 않습니다.' }, { status: 400 });
    }

    if (paymentData.userId !== decoded.uid) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    if (paymentData.status === 'CONFIRMED') {
      return NextResponse.json({ success: true, message: '이미 처리된 결제입니다.' });
    }

    const tossResult = await confirmPayment(paymentKey, orderId, amount);
    if (!tossResult.success) {
      return NextResponse.json({ success: false, error: tossResult.error }, { status: 400 });
    }

    await adminFirestore.doc(`payments/${orderId}`).update({
      paymentKey,
      status: 'CONFIRMED',
      confirmedAt: Date.now(),
      method: (tossResult.data?.method as string) || 'CARD',
    });

    const roomId = paymentData.roomId;
    await adminFirestore.doc(`prizeRooms/${roomId}`).update({
      status: 'PENDING_REVIEW',
      paymentId: orderId,
      paymentAmount: amount,
      paymentStatus: 'PAID',
      updatedAt: Date.now(),
    });

    return NextResponse.json({ success: true, roomId });
  } catch (error) {
    console.error('Payment confirm error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
