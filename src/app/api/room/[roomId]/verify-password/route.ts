import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebase/admin';

export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const { roomId } = params;
    const { password } = (await req.json()) as { password?: string };

    const roomDoc = await adminFirestore.collection('rooms').doc(roomId).get();
    if (!roomDoc.exists) {
      return NextResponse.json({ success: false, error: '방을 찾을 수 없습니다' }, { status: 404 });
    }

    const roomData = roomDoc.data();
    if (!roomData?.hasPassword) {
      return NextResponse.json({ success: true });
    }

    if (roomData.password === password) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: '비밀번호가 틀렸습니다' }, { status: 403 });
  } catch (error) {
    console.error('Verify password error:', error);
    return NextResponse.json({ success: false, error: '서버 오류' }, { status: 500 });
  }
}
