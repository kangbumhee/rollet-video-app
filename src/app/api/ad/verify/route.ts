import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase/admin';
import { adminFirestore } from '@/lib/firebase/admin';
import { getDatabase } from 'firebase-admin/database';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const user = await verifyAuth(token);
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 });

    const { roomId, watchDuration } = await req.json();
    if (!roomId || !watchDuration) {
      return NextResponse.json({ success: false, error: '필수 파라미터 누락' }, { status: 400 });
    }

    if (watchDuration < 10) {
      return NextResponse.json({ success: false, error: '광고를 끝까지 시청해주세요.' }, { status: 400 });
    }

    // 광고 시청 로그 저장
    await adminFirestore.collection('adLogs').add({
      uid: user.uid,
      roomId,
      watchDuration,
      verified: true,
      createdAt: Date.now(),
    });

    // 티켓을 Realtime Database에 기록
    const rtdb = getDatabase();
    await rtdb.ref(`rooms/main/tickets/${user.uid}`).set({
      uid: user.uid,
      displayName: user.email || '익명',
      joinedAt: Date.now(),
      method: 'ad',
    });

    return NextResponse.json({ success: true, message: '참가 티켓 발급 완료' });
  } catch (error) {
    console.error('Ad verify error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
