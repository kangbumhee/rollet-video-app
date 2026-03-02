// src/app/api/ad/verify/route.ts
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

    const { roomId, watchDuration } = (await req.json()) as { roomId?: string; watchDuration?: number };
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId가 필요합니다.' }, { status: 400 });
    }

    if (typeof watchDuration !== 'number' || watchDuration < 10) {
      return NextResponse.json({ success: false, error: '광고를 충분히 시청하지 않았습니다.' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const logId = `${decoded.uid}_${roomId}_${today}`;
    const existing = await adminFirestore.doc(`adWatchLogs/${logId}`).get();

    if (existing.exists) {
      return NextResponse.json({ success: true, message: '오늘 이미 광고 시청 인증됨', alreadyVerified: true });
    }

    await adminFirestore.doc(`adWatchLogs/${logId}`).set({
      uid: decoded.uid,
      roomId,
      watchDuration,
      verifiedAt: Date.now(),
      date: today,
    });

    const userRef = adminFirestore.doc(`users/${decoded.uid}`);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};

    await userRef.update({
      tickets: (userData.tickets || 0) + 1,
      points: (userData.points || 0) + 5,
      totalExp: (userData.totalExp || 0) + 5,
    });

    return NextResponse.json({
      success: true,
      ticketsGranted: 1,
      pointsGranted: 5,
      expGranted: 5,
    });
  } catch (error) {
    console.error('Ad verify error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
