// src/app/api/admin/rooms/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminFirestore } from '@/lib/firebase/admin';

const ADMIN_UID = process.env.ADMIN_UID || '';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const decoded = await verifyAuth(authHeader.split('Bearer ')[1]);
    if (!decoded || decoded.uid !== ADMIN_UID) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { roomId, reason } = (await req.json()) as { roomId?: string; reason?: string };
    if (!roomId || !reason) {
      return NextResponse.json({ success: false, error: 'roomId와 반려 사유가 필요합니다.' }, { status: 400 });
    }

    const roomDoc = await adminFirestore.doc(`prizeRooms/${roomId}`).get();
    if (!roomDoc.exists) {
      return NextResponse.json({ success: false, error: '방을 찾을 수 없습니다.' }, { status: 404 });
    }

    const room = roomDoc.data() as { ownerId: string; prizeTitle: string; paymentId?: string; paymentStatus?: string };

    await adminFirestore.doc(`prizeRooms/${roomId}`).update({
      status: 'REJECTED',
      reviewNote: reason,
      updatedAt: Date.now(),
    });

    await adminFirestore.collection('notifications').add({
      targetUid: room.ownerId,
      type: 'ROOM_REJECTED',
      title: '❌ 방이 반려되었습니다',
      message: `"${room.prizeTitle}" 경품 방이 반려되었습니다. 사유: ${reason}`,
      roomId,
      read: false,
      createdAt: Date.now(),
    });

    if (room.paymentId && room.paymentStatus === 'PAID') {
      await adminFirestore.doc(`prizeRooms/${roomId}`).update({
        paymentStatus: 'REFUND_PENDING',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reject error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
