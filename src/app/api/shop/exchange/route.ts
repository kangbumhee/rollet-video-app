import { NextRequest, NextResponse } from 'next/server';
import { adminFirestore } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth?.uid) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await req.json();
    const itemId = body?.itemId as string | undefined;
    if (!itemId) {
      return NextResponse.json({ error: '상품 ID가 필요합니다.' }, { status: 400 });
    }

    const userRef = adminFirestore.collection('users').doc(auth.uid);
    const itemRef = adminFirestore.collection('shopItems').doc(itemId);

    const result = await adminFirestore.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef);
      const itemDoc = await tx.get(itemRef);

      if (!itemDoc.exists) {
        throw new Error('NOT_FOUND');
      }

      const item = itemDoc.data() as {
        name: string;
        price: number;
        stock: number;
        isActive: boolean;
        externalURL?: string;
      };

      if (!item.isActive) {
        throw new Error('INACTIVE');
      }
      if (item.stock === 0) {
        throw new Error('OUT_OF_STOCK');
      }

      const userData = userDoc.data();
      const currentPoints = userData?.points ?? 0;
      if (currentPoints < item.price) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      const newBalance = currentPoints - item.price;
      const now = Date.now();

      tx.update(userRef, { points: newBalance });

      if (item.stock > 0) {
        tx.update(itemRef, { stock: item.stock - 1 });
      }

      tx.set(userRef.collection('pointHistory').doc(), {
        type: 'spend',
        amount: item.price,
        reason: `상품 교환 - ${item.name}`,
        balance: newBalance,
        createdAt: now,
      });

      tx.set(userRef.collection('orders').doc(), {
        itemId,
        itemName: item.name,
        pointsUsed: item.price,
        status: 'pending',
        createdAt: now,
        externalURL: item.externalURL,
      });

      return { newBalance, itemName: item.name };
    });

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      itemName: result.itemName,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN';
    if (msg === 'NOT_FOUND') {
      return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }
    if (msg === 'INACTIVE') {
      return NextResponse.json({ error: '판매 중인 상품이 아닙니다.' }, { status: 400 });
    }
    if (msg === 'OUT_OF_STOCK') {
      return NextResponse.json({ error: '재고가 없습니다.' }, { status: 400 });
    }
    if (msg === 'INSUFFICIENT_POINTS') {
      return NextResponse.json({ error: '포인트가 부족합니다.' }, { status: 400 });
    }
    console.error('Shop exchange error:', e);
    return NextResponse.json({ error: '교환 처리에 실패했습니다.' }, { status: 500 });
  }
}
