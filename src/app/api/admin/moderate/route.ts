import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebase/admin';
import { getDatabase } from 'firebase-admin/database';

async function checkAdminOrMod(token: string) {
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminFirestore.collection('users').doc(decoded.uid).get();
  const userData = userDoc.data();
  if (!userData?.isAdmin && !userData?.isModerator) {
    return null;
  }
  return {
    uid: decoded.uid,
    displayName: userData.displayName || decoded.uid,
    isAdmin: Boolean(userData.isAdmin),
    isModerator: Boolean(userData.isModerator),
  };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const caller = await checkAdminOrMod(token);
    if (!caller) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const { action, targetUid, targetDisplayName } = await req.json();
    if (!targetUid || !targetDisplayName) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
    }

    const rtdb = getDatabase();

    if (action === 'setModerator') {
      if (!caller.isAdmin) {
        return NextResponse.json({ error: '관리자만 운영자를 지정할 수 있습니다' }, { status: 403 });
      }
      await adminFirestore.collection('users').doc(targetUid).set({ isModerator: true }, { merge: true });
      return NextResponse.json({ success: true, message: `${targetDisplayName}님을 운영자로 지정했습니다` });
    }

    if (action === 'removeModerator') {
      if (!caller.isAdmin) {
        return NextResponse.json({ error: '관리자만 운영자를 해제할 수 있습니다' }, { status: 403 });
      }
      await adminFirestore.collection('users').doc(targetUid).set({ isModerator: false }, { merge: true });
      return NextResponse.json({ success: true, message: `${targetDisplayName}님의 운영자를 해제했습니다` });
    }

    if (action === 'kick') {
      await adminFirestore.collection('kickLogs').add({
        targetUid,
        targetDisplayName,
        kickedBy: caller.uid,
        kickedByName: caller.displayName,
        kickedAt: Date.now(),
      });

      await adminFirestore.collection('bannedUsers').doc(targetUid).set({
        uid: targetUid,
        displayName: targetDisplayName,
        bannedBy: caller.uid,
        bannedByName: caller.displayName,
        bannedAt: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000,
        reason: 'kicked_by_moderator',
        type: 'kick',
      });

      await rtdb.ref(`rooms/main/tickets/${targetUid}`).remove();

      await rtdb.ref('chat/main/messages').push({
        uid: 'SYSTEM',
        displayName: '시스템',
        text: `${targetDisplayName}님이 강퇴되었습니다.`,
        timestamp: Date.now(),
        type: 'system',
        isSystem: true,
      });

      return NextResponse.json({ success: true, message: `${targetDisplayName}님을 강퇴했습니다 (30분)` });
    }

    if (action === 'mute') {
      const duration = 10 * 60 * 1000;
      await adminFirestore.collection('mutedUsers').doc(targetUid).set({
        uid: targetUid,
        displayName: targetDisplayName,
        mutedBy: caller.uid,
        mutedByName: caller.displayName,
        mutedAt: Date.now(),
        expiresAt: Date.now() + duration,
      });

      await rtdb.ref('chat/main/messages').push({
        uid: 'SYSTEM',
        displayName: '시스템',
        text: `${targetDisplayName}님이 10분간 채팅 금지되었습니다.`,
        timestamp: Date.now(),
        type: 'system',
        isSystem: true,
      });

      return NextResponse.json({ success: true, message: `${targetDisplayName}님 채팅 금지 (10분)` });
    }

    if (action === 'unmute') {
      await adminFirestore.collection('mutedUsers').doc(targetUid).delete();

      await rtdb.ref('chat/main/messages').push({
        uid: 'SYSTEM',
        displayName: '시스템',
        text: `${targetDisplayName}님의 채팅 금지가 해제되었습니다.`,
        timestamp: Date.now(),
        type: 'system',
        isSystem: true,
      });

      return NextResponse.json({ success: true, message: `${targetDisplayName}님 채팅 금지 해제` });
    }

    return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 });
  } catch (error) {
    console.error('Moderate error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

