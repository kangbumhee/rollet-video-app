import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminFirestore } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  const decoded = await verifyAuth(req);
  if (!decoded) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

  const userDoc = await adminFirestore.doc(`users/${decoded.uid}`).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    return NextResponse.json({ error: '관리자만 가능' }, { status: 403 });
  }

  const { slotId, gameType } = (await req.json()) as { slotId?: string; gameType?: string };
  if (!slotId || !gameType) {
    return NextResponse.json({ error: 'slotId, gameType 필요' }, { status: 400 });
  }

  await adminFirestore.doc(`scheduleSlots/${slotId}`).update({ gameType });

  const slotDoc = await adminFirestore.doc(`scheduleSlots/${slotId}`).get();
  const roomId = slotDoc.data()?.roomId;
  if (roomId) {
    await adminFirestore.doc(`rooms/${roomId}`).update({ gameType });
  }

  return NextResponse.json({ success: true });
}
