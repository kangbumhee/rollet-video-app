// src/app/api/video/verify/route.ts
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

    const { roomId, watchedSeconds, totalDuration, watchPercent } = (await req.json()) as {
      roomId?: string;
      watchedSeconds?: number;
      totalDuration?: number;
      watchPercent?: number;
    };

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId가 필요합니다.' }, { status: 400 });
    }

    if (typeof watchPercent !== 'number' || watchPercent < 90) {
      return NextResponse.json({ success: false, error: '영상을 90% 이상 시청해야 합니다.' }, { status: 400 });
    }

    const watchLogId = `${decoded.uid}_${roomId}`;
    const existing = await adminFirestore.doc(`videoWatchLogs/${watchLogId}`).get();
    if (existing.exists) {
      return NextResponse.json({ success: true, message: '이미 시청 인증되었습니다.', alreadyVerified: true });
    }

    await adminFirestore.doc(`videoWatchLogs/${watchLogId}`).set({
      uid: decoded.uid,
      roomId,
      watchedSeconds: watchedSeconds || 0,
      totalDuration: totalDuration || 0,
      watchPercent,
      verifiedAt: Date.now(),
    });

    const userRef = adminFirestore.doc(`users/${decoded.uid}`);
    const userDoc = await userRef.get();
    const currentTickets = (userDoc.data()?.tickets as number) || 0;
    const currentExp = (userDoc.data()?.totalExp as number) || 0;
    await userRef.update({
      tickets: currentTickets + 1,
      totalExp: currentExp + 3,
    });

    return NextResponse.json({ success: true, ticketsGranted: 1, expGranted: 3 });
  } catch (error) {
    console.error('Video verify error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
