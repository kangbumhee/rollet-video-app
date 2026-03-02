import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebase/admin';

async function checkAdmin(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminFirestore.collection('users').doc(decoded.uid).get();
  const userData = userDoc.data();
  if (!userData?.isAdmin) return null;
  return decoded;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }
    const caller = await checkAdmin(authHeader.split('Bearer ')[1]);
    if (!caller) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
    }

    const bannedSnap = await adminFirestore
      .collection('bannedUsers')
      .orderBy('bannedAt', 'desc')
      .limit(100)
      .get();
    const bannedUsers = bannedSnap.docs.map((doc) => ({
      id: doc.id,
      type: 'kick',
      ...doc.data(),
    }));

    const mutedSnap = await adminFirestore
      .collection('mutedUsers')
      .orderBy('mutedAt', 'desc')
      .limit(100)
      .get();
    const mutedUsers = mutedSnap.docs.map((doc) => ({
      id: doc.id,
      type: 'mute',
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, bannedUsers, mutedUsers });
  } catch (error) {
    console.error('Banned list error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }
    const caller = await checkAdmin(authHeader.split('Bearer ')[1]);
    if (!caller) {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
    }

    const { docId, type } = await req.json();
    if (!docId || !type) {
      return NextResponse.json({ error: 'docId, type 필요' }, { status: 400 });
    }

    const collection = type === 'mute' ? 'mutedUsers' : 'bannedUsers';
    await adminFirestore.collection(collection).doc(docId).delete();

    return NextResponse.json({ success: true, message: '해제 완료' });
  } catch (error) {
    console.error('Unban error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
