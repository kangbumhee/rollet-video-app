// src/app/api/winner/shipping/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminFirestore } from '@/lib/firebase/admin';

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

    const { roomId, recipientName, recipientPhone, recipientAddress, recipientZipcode } = (await req.json()) as {
      roomId?: string;
      recipientName?: string;
      recipientPhone?: string;
      recipientAddress?: string;
      recipientZipcode?: string;
    };

    if (!roomId || !recipientName || !recipientPhone || !recipientAddress || !recipientZipcode) {
      return NextResponse.json({ success: false, error: '모든 배송 정보를 입력해주세요.' }, { status: 400 });
    }

    const normalizedPhone = recipientPhone.replace(/-/g, '');
    const phoneRegex = /^01[0-9][0-9]{7,8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return NextResponse.json({ success: false, error: '올바른 전화번호를 입력해주세요.' }, { status: 400 });
    }

    if (!/^\d{5}$/.test(recipientZipcode)) {
      return NextResponse.json({ success: false, error: '올바른 우편번호를 입력해주세요.' }, { status: 400 });
    }

    const roomDoc = await adminFirestore.doc(`prizeRooms/${roomId}`).get();
    if (!roomDoc.exists) {
      return NextResponse.json({ success: false, error: '방을 찾을 수 없습니다.' }, { status: 404 });
    }

    const room = roomDoc.data() as {
      winnerId?: string;
      shippingInfo?: { recipientName?: string };
      deliveryType: string;
      prizeTitle: string;
      ownerId: string;
    };
    if (room.winnerId !== decoded.uid) {
      return NextResponse.json({ success: false, error: '당첨자만 배송 정보를 입력할 수 있습니다.' }, { status: 403 });
    }

    if (room.shippingInfo?.recipientName) {
      return NextResponse.json({ success: true, message: '이미 배송 정보가 등록되었습니다.', alreadySubmitted: true });
    }

    const shippingInfo = {
      recipientName: recipientName.trim(),
      recipientPhone: normalizedPhone,
      recipientAddress: recipientAddress.trim(),
      recipientZipcode,
      shippingStatus: 'PENDING',
    };

    await adminFirestore.doc(`prizeRooms/${roomId}`).set(
      {
        shippingInfo,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    const winnerRecordQuery = await adminFirestore
      .collection('winnerRecords')
      .where('roomId', '==', roomId)
      .where('winnerId', '==', decoded.uid)
      .limit(1)
      .get();

    if (!winnerRecordQuery.empty) {
      await winnerRecordQuery.docs[0].ref.update({
        shippingInfoSubmitted: true,
        shippingInfo,
        updatedAt: Date.now(),
      });
    }

    if (room.deliveryType === 'CONSIGNMENT') {
      await adminFirestore.collection('notifications').add({
        targetUid: process.env.ADMIN_UID || '',
        type: 'SHIPPING_INFO_SUBMITTED',
        title: '📦 당첨자 배송 정보 입력 완료',
        message: `"${room.prizeTitle}" 위탁 배송 건의 배송 정보가 입력되었습니다. 스마트스토어 발주 처리를 진행하세요.`,
        roomId,
        read: false,
        createdAt: Date.now(),
      });
    } else {
      await adminFirestore.collection('notifications').add({
        targetUid: room.ownerId,
        type: 'SHIPPING_INFO_SUBMITTED',
        title: '📦 당첨자 배송 정보 입력 완료',
        message: `"${room.prizeTitle}" 당첨자의 배송 정보가 입력되었습니다. 발송을 진행해주세요.`,
        roomId,
        read: false,
        createdAt: Date.now(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Shipping info error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
