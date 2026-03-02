// src/app/api/admin/rooms/approve/route.ts
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

    const { roomId } = (await req.json()) as { roomId?: string };
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId가 필요합니다.' }, { status: 400 });
    }

    const roomDoc = await adminFirestore.doc(`prizeRooms/${roomId}`).get();
    if (!roomDoc.exists) {
      return NextResponse.json({ success: false, error: '방을 찾을 수 없습니다.' }, { status: 404 });
    }

    const room = roomDoc.data() as { status: string; ownerId: string; prizeTitle: string };
    if (room.status !== 'PENDING_REVIEW') {
      return NextResponse.json({ success: false, error: `현재 상태(${room.status})에서는 승인할 수 없습니다.` }, { status: 400 });
    }

    const now = Date.now();
    const KST_OFFSET = 9 * 60 * 60 * 1000;
    const kst = new Date(now + KST_OFFSET);
    const h = kst.getHours();
    const m = kst.getMinutes();

    let slotH = h;
    let slotM: number;
    if (m < 30) {
      slotM = 30;
    } else {
      slotM = 0;
      slotH = h + 1;
      if (slotH >= 24) slotH = 0;
    }

    const slotStr = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}T${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;

    const existingSlot = await adminFirestore
      .collection('prizeRooms')
      .where('scheduledSlot', '==', slotStr)
      .where('status', 'in', ['SCHEDULED', 'LIVE'])
      .limit(1)
      .get();

    let finalSlot = slotStr;
    let finalStartTime = new Date(`${slotStr}:00+09:00`).getTime();

    if (!existingSlot.empty) {
      const nextTime = finalStartTime + 30 * 60 * 1000;
      const nextKst = new Date(nextTime + KST_OFFSET);
      finalSlot = `${nextKst.getFullYear()}-${String(nextKst.getMonth() + 1).padStart(2, '0')}-${String(nextKst.getDate()).padStart(2, '0')}T${String(nextKst.getHours()).padStart(2, '0')}:${String(nextKst.getMinutes()).padStart(2, '0')}`;
      finalStartTime = nextTime;
    }

    await adminFirestore.doc(`prizeRooms/${roomId}`).update({
      status: 'SCHEDULED',
      scheduledSlot: finalSlot,
      scheduledAt: finalStartTime,
      updatedAt: Date.now(),
    });

    await adminFirestore.collection('notifications').add({
      targetUid: room.ownerId,
      type: 'ROOM_APPROVED',
      title: '✅ 방이 승인되었습니다!',
      message: `"${room.prizeTitle}" 경품 방이 승인되었습니다. 스케줄: ${finalSlot.replace('T', ' ')} KST`,
      roomId,
      read: false,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      scheduledSlot: finalSlot,
      scheduledAt: finalStartTime,
    });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
