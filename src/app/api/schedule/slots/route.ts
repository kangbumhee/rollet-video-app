// src/app/api/schedule/slots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminFirestore } from '@/lib/firebase/admin';
import { generateDaySlots, applyEnabledSlots } from '@/lib/schedule/slots';
import type { DayScheduleConfig, CalendarDayData } from '@/types/schedule';

const ADMIN_UID = process.env.ADMIN_UID || '';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const decoded = await verifyAuth(authHeader.split('Bearer ')[1]);
    if (!decoded || decoded.uid !== ADMIN_UID) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const summary = searchParams.get('summary');

    if (summary && startDate && endDate) {
      const summaryData: Record<string, CalendarDayData> = {};
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const configDoc = await adminFirestore.doc(`scheduleConfigs/${dateStr}`).get();

        if (configDoc.exists) {
          const config = configDoc.data() as DayScheduleConfig;
          const totalSlots = config.enabledSlots.length;
          const assignedQuery = await adminFirestore.collection('scheduleSlots').where('date', '==', dateStr).where('roomId', '!=', null).get();

          summaryData[dateStr] = {
            date: dateStr,
            totalSlots,
            assignedSlots: assignedQuery.size,
            completedSlots: 0,
            hasLive: false,
          };
        }
      }

      return NextResponse.json({ success: true, summary: summaryData });
    }

    if (!date) {
      return NextResponse.json({ success: false, error: 'date 파라미터가 필요합니다.' }, { status: 400 });
    }

    const configDoc = await adminFirestore.doc(`scheduleConfigs/${date}`).get();
    const config = configDoc.exists ? (configDoc.data() as DayScheduleConfig) : null;

    let slots = generateDaySlots(date);
    slots = applyEnabledSlots(slots, config);

    const slotDocs = await adminFirestore.collection('scheduleSlots').where('date', '==', date).get();
    const slotMap = new Map<string, Record<string, unknown>>();
    slotDocs.forEach((doc) => {
      slotMap.set(doc.id, doc.data());
    });

    slots = slots.map((slot) => {
      const saved = slotMap.get(slot.id);
      if (saved) {
        const savedStatus = saved.status as string;
        return {
          ...slot,
          roomId: (saved.roomId as string) || null,
          prizeTitle: (saved.prizeTitle as string) || null,
          prizeImageURL: (saved.prizeImageURL as string) || null,
          gameType: (saved.gameType as string) || null,
          status: saved.roomId ? (savedStatus === 'LIVE' ? 'LIVE' : savedStatus === 'COMPLETED' ? 'COMPLETED' : 'ASSIGNED') : slot.enabled ? 'EMPTY' : 'DISABLED',
        };
      }
      return slot;
    });

    return NextResponse.json({ success: true, slots, config });
  } catch (error) {
    console.error('Schedule slots GET error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
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

    const { date, enabledSlots } = (await req.json()) as { date?: string; enabledSlots?: string[] };
    if (!date || !Array.isArray(enabledSlots)) {
      return NextResponse.json({ success: false, error: 'date와 enabledSlots가 필요합니다.' }, { status: 400 });
    }

    const validTimePattern = /^([01]\d|2[0-3]):(00|30)$/;
    const validSlots = enabledSlots.filter((s) => validTimePattern.test(s));

    const config: DayScheduleConfig = {
      date,
      enabledSlots: validSlots,
      updatedAt: Date.now(),
      updatedBy: decoded.uid,
    };
    await adminFirestore.doc(`scheduleConfigs/${date}`).set(config);

    for (const time of validSlots) {
      const slotId = `${date}_${time}`;
      const slotDoc = await adminFirestore.doc(`scheduleSlots/${slotId}`).get();

      if (!slotDoc.exists) {
        await adminFirestore.doc(`scheduleSlots/${slotId}`).set({
          id: slotId,
          date,
          time,
          enabled: true,
          roomId: null,
          status: 'EMPTY',
          scheduledAt: new Date(`${date}T${time}:00+09:00`).getTime(),
          createdAt: Date.now(),
        });
      } else {
        await adminFirestore.doc(`scheduleSlots/${slotId}`).update({
          enabled: true,
        });
      }
    }

    const allSlotDocs = await adminFirestore.collection('scheduleSlots').where('date', '==', date).get();
    for (const doc of allSlotDocs.docs) {
      const slotTime = doc.data().time as string;
      if (!validSlots.includes(slotTime)) {
        await doc.ref.update({ enabled: false, status: 'DISABLED' });
      }
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Schedule slots POST error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}
