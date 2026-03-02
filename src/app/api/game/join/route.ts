// src/app/api/game/join/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase/admin';
import { joinGame } from '@/lib/game/engine';

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const { sessionId, roomId, displayName, photoURL, level } = await req.json();
    if (!sessionId || !roomId) {
      return NextResponse.json({ success: false, error: '필수 파라미터 누락' }, { status: 400 });
    }

    const result = await joinGame(sessionId, roomId, {
      uid: user.uid,
      displayName: displayName || '익명',
      photoURL: photoURL || undefined,
      level: level || 1,
      joinedAt: Date.now(),
      eliminated: false,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Game join error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}
