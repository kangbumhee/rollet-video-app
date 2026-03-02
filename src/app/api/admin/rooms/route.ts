// src/app/api/admin/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, adminFirestore } from '@/lib/firebase/admin';

const ADMIN_UID = process.env.ADMIN_UID || '';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const decoded = await verifyAuth(authHeader.split('Bearer ')[1]);
    if (!decoded || decoded.uid !== ADMIN_UID) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'APPROVED';

    // rooms 컬렉션에서 조회 (prizeRooms가 아님)
    const snapshot = await adminFirestore
      .collection('rooms')
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const rooms = snapshot.docs.map((doc) => {
      const data = doc.data();
      // prize/create에서 저장한 nested 구조를 flat으로 변환
      return {
        id: doc.id,
        prizeTitle: data.prize?.title || data.prizeTitle || '경품',
        prizeDescription: data.prize?.description || data.prizeDescription || '',
        prizeImageURL: data.prize?.imageURL || data.prizeImageURL || '',
        estimatedValue: data.prize?.estimatedValue || data.estimatedValue || 0,
        gameType: data.gameType || 'luckyDice',
        deliveryType: data.deliveryType || 'SELF_DELIVERY',
        status: data.status,
        totalQuantity: data.totalQuantity || 1,
        remainingQuantity: data.remainingQuantity ?? data.totalQuantity ?? 1,
        scheduledAt: data.scheduledAt || null,
        createdAt: data.createdAt,
      };
    });

    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    console.error('Admin rooms error:', error);
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
