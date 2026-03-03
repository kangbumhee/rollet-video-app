// src/app/api/schedule/assign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminFirestore, adminRealtimeDb } from '@/lib/firebase/admin';
import { parseSlotId } from '@/lib/schedule/slots';

const ADMIN_UID = process.env.ADMIN_UID || '';

async function updateNextSlotInRTDB() {
  const now = Date.now();
  const slotsSnap = await adminFirestore
    .collection('scheduleSlots')
    .where('status', '==', 'ASSIGNED')
    .where('scheduledAt', '>', now)
    .orderBy('scheduledAt', 'asc')
    .limit(1)
    .get();

  if (slotsSnap.empty) {
    await adminRealtimeDb.ref('cycle/main').update({
      nextSlot: null,
      currentPrizeTitle: null,
      currentPrizeImage: null,
      currentGameType: null,
    });
    return;
  }

  const nextSlotData = slotsSnap.docs[0].data();
  const slotDate = nextSlotData.date as string;
  const slotTime = nextSlotData.time as string;
  const nextSlotString = `${slotDate}T${slotTime}`;

  await adminRealtimeDb.ref('cycle/main').update({
    nextSlot: nextSlotString,
    currentPrizeTitle: nextSlotData.prizeTitle || null,
    currentPrizeImage: nextSlotData.prizeImageURL || null,
    currentGameType: nextSlotData.gameType || null,
  });
}

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

    const roomDoc = await adminFirestore.doc(`rooms/${roomId}`).get();
    if (!roomDoc.exists) {
      return NextResponse.json({ success: false, error: '방을 찾을 수 없습니다.' }, { status: 404 });
    }

    const room = roomDoc.data() as Record<string, unknown> & {
      status: string;
      prize?: { title?: string; imageURL?: string; estimatedValue?: number };
      prizeTitle?: string;
      prizeImageURL?: string;
      gameType?: string;
      totalQuantity?: number;
      remainingQuantity?: number;
    };
    if (!['APPROVED', 'SCHEDULED'].includes(room.status)) {
      return NextResponse.json({ success: false, error: `배정 불가 상태 (${room.status})` }, { status: 400 });
    }

    // 남은 수량 체크
    const remaining = room.remainingQuantity ?? room.totalQuantity ?? 1;
    if (remaining <= 0) {
      return NextResponse.json({ success: false, error: '해당 경품의 남은 수량이 없습니다' }, { status: 400 });
    }

    const { date, time } = parseSlotId(slotId);
    const scheduledAt = new Date(`${date}T${time}:00+09:00`).getTime();
    const prizeTitle = room.prize?.title || room.prizeTitle || '';
    const prizeImageURL = room.prize?.imageURL || room.prizeImageURL || '';
    const gameType = room.gameType || 'luckyDice';

    await adminFirestore.doc(`scheduleSlots/${slotId}`).set(
      {
        id: slotId,
        date,
        time,
        enabled: true,
        roomId,
        prizeTitle,
        prizeImageURL,
        gameType,
        status: 'ASSIGNED',
        scheduledAt,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    await adminFirestore.doc(`rooms/${roomId}`).update({
      remainingQuantity: remaining - 1,
      status: remaining - 1 > 0 ? 'APPROVED' : 'SCHEDULED',
      scheduledSlot: `${date}T${time}`,
      scheduledAt,
      updatedAt: Date.now(),
    });

    await updateNextSlotInRTDB();

    return NextResponse.json({
      success: true,
      prizeTitle,
      prizeImageURL,
      gameType,
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
      await adminFirestore.doc(`rooms/${roomId}`).update({
        status: 'APPROVED',
        scheduledSlot: null,
        scheduledAt: null,
        updatedAt: Date.now(),
      });

      // 남은 수량 1 복구
      const roomDoc = await adminFirestore.doc(`rooms/${roomId}`).get();
      if (roomDoc.exists) {
        const roomData = roomDoc.data() as { remainingQuantity?: number; totalQuantity?: number };
        const currentRemaining = roomData.remainingQuantity ?? 0;
        const total = roomData.totalQuantity ?? 1;
        await adminFirestore.doc(`rooms/${roomId}`).update({
          remainingQuantity: Math.min(currentRemaining + 1, total),
          status: 'APPROVED',
        });
      }
    }

    await updateNextSlotInRTDB();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedule unassign error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}
