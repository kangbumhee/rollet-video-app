// src/app/api/schedule/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminFirestore } from '@/lib/firebase/admin';
import { parseSlotId } from '@/lib/schedule/slots';

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

    const { slotId, roomId } = (await req.json()) as { slotId?: string; roomId?: string };
    if (!slotId || !roomId) {
      return NextResponse.json({ success: false, error: 'slotId와 roomId가 필요합니다.' }, { status: 400 });
    }

    const roomDoc = await adminFirestore.doc(`prizeRooms/${roomId}`).get();
    if (!roomDoc.exists) {
      return NextResponse.json({ success: false, error: '방을 찾을 수 없습니다.' }, { status: 404 });
    }

    const room = roomDoc.data() as {
      status: string;
      prizeTitle?: string;
      prizeImageURL?: string;
      gameType?: string;
    };
    if (!['APPROVED', 'SCHEDULED'].includes(room.status)) {
      return NextResponse.json({ success: false, error: `이 방은 배정할 수 없는 상태입니다. (${room.status})` }, { status: 400 });
    }

    const existingAssignment = await adminFirestore
      .collection('scheduleSlots')
      .where('roomId', '==', roomId)
      .where('status', 'in', ['ASSIGNED', 'LIVE'])
      .limit(1)
      .get();

    if (!existingAssignment.empty) {
      const existingSlot = existingAssignment.docs[0].data() as { date?: string; time?: string };
      return NextResponse.json(
        {
          success: false,
          error: `이 경품은 이미 ${existingSlot.date} ${existingSlot.time}에 배정되어 있습니다.`,
        },
        { status: 400 }
      );
    }

    const { date, time } = parseSlotId(slotId);
    const scheduledAt = new Date(`${date}T${time}:00+09:00`).getTime();

    await adminFirestore.doc(`scheduleSlots/${slotId}`).set(
      {
        id: slotId,
        date,
        time,
        enabled: true,
        roomId,
        prizeTitle: room.prizeTitle || '',
        prizeImageURL: room.prizeImageURL || '',
        gameType: room.gameType || 'rps',
        status: 'ASSIGNED',
        scheduledAt,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    await adminFirestore.doc(`prizeRooms/${roomId}`).update({
      status: 'SCHEDULED',
      scheduledSlot: `${date}T${time}`,
      scheduledAt,
      updatedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      prizeTitle: room.prizeTitle || '',
      prizeImageURL: room.prizeImageURL || '',
      gameType: room.gameType || 'rps',
    });
  } catch (error) {
    console.error('Schedule assign error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const decoded = await verifyAuth(authHeader.split('Bearer ')[1]);
    if (!decoded || decoded.uid !== ADMIN_UID) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { slotId } = (await req.json()) as { slotId?: string };
    if (!slotId) {
      return NextResponse.json({ success: false, error: 'slotId가 필요합니다.' }, { status: 400 });
    }

    const slotDoc = await adminFirestore.doc(`scheduleSlots/${slotId}`).get();
    if (!slotDoc.exists) {
      return NextResponse.json({ success: false, error: '슬롯을 찾을 수 없습니다.' }, { status: 404 });
    }

    const slotData = slotDoc.data() as { status?: string; roomId?: string | null };
    if (slotData.status === 'LIVE') {
      return NextResponse.json({ success: false, error: '라이브 중인 슬롯은 해제할 수 없습니다.' }, { status: 400 });
    }

    const roomId = slotData.roomId;
    await adminFirestore.doc(`scheduleSlots/${slotId}`).update({
      roomId: null,
      prizeTitle: null,
      prizeImageURL: null,
      gameType: null,
      status: 'EMPTY',
      updatedAt: Date.now(),
    });

    if (roomId) {
      await adminFirestore.doc(`prizeRooms/${roomId}`).update({
        status: 'APPROVED',
        scheduledSlot: null,
        scheduledAt: null,
        updatedAt: Date.now(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedule unassign error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}
