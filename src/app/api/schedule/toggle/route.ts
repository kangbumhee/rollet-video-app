// src/app/api/schedule/toggle/route.ts
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

    const { slotId, enabled } = (await req.json()) as { slotId?: string; enabled?: boolean };
    if (!slotId || typeof enabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'slotId와 enabled가 필요합니다.' }, { status: 400 });
    }

    const { date, time } = parseSlotId(slotId);

    await adminFirestore.doc(`scheduleSlots/${slotId}`).set(
      {
        id: slotId,
        date,
        time,
        enabled,
        status: enabled ? 'EMPTY' : 'DISABLED',
        scheduledAt: new Date(`${date}T${time}:00+09:00`).getTime(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    const configDoc = await adminFirestore.doc(`scheduleConfigs/${date}`).get();
    let enabledSlots: string[] = [];
    if (configDoc.exists) {
      enabledSlots = (configDoc.data()?.enabledSlots as string[]) || [];
    }

    if (enabled && !enabledSlots.includes(time)) {
      enabledSlots.push(time);
      enabledSlots.sort();
    } else if (!enabled) {
      enabledSlots = enabledSlots.filter((t: string) => t !== time);
    }

    await adminFirestore.doc(`scheduleConfigs/${date}`).set(
      {
        date,
        enabledSlots,
        updatedAt: Date.now(),
        updatedBy: decoded.uid,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error('Schedule toggle error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}
