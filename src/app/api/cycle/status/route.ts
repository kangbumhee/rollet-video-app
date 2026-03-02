// src/app/api/cycle/status/route.ts
import { NextResponse } from 'next/server';
import { adminRealtimeDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const snap = await adminRealtimeDb.ref('cycle/main').get();

    if (!snap.exists()) {
      return NextResponse.json({
        success: true,
        data: {
          currentPhase: 'IDLE',
          currentRoomId: null,
          nextSlot: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: snap.val(),
    });
  } catch (error) {
    console.error('Cycle status error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
