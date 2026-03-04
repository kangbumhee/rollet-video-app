// src/app/api/cycle/next/route.ts
import { NextResponse } from 'next/server';
import { getNextAvailableSlot } from '@/lib/cycle/scheduler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const next = await getNextAvailableSlot();
    return NextResponse.json({ success: true, data: next });
  } catch (error) {
    console.error('Cycle next error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
