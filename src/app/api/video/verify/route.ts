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

    const { roomId, watchedSeconds, totalDuration, watchPercent } = await req.json();
    if (!roomId) {
      return NextResponse.json({ success: false, error: '필수 파라미터 누락' }, { status: 400 });
    }

    if (watchPercent < 85) {
      return NextResponse.json({ success: false, error: '영상을 90% 이상 시청해야 합니다.' }, { status: 400 });
    }

    // 시청 로그 저장
    await adminFirestore.collection('videoWatchLogs').add({
      uid: user.uid,
      roomId,
      watchedSeconds: watchedSeconds || 0,
      totalDuration: totalDuration || 0,
      watchPercent: watchPercent || 0,
      verified: true,
      createdAt: Date.now(),
    });

    // 티켓을 Realtime Database에 기록
    const rtdb = getDatabase();
    await rtdb.ref(`rooms/main/tickets/${user.uid}`).set({
      uid: user.uid,
      displayName: user.email || '익명',
      joinedAt: Date.now(),
      method: 'video',
    });

    return NextResponse.json({ success: true, message: '시청 인증 완료, 참가 티켓 발급' });
  } catch (error) {
    console.error('Video verify error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
