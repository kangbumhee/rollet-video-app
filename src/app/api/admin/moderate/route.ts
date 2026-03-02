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

async function isTargetAdmin(targetUid: string): Promise<boolean> {
  const doc = await adminFirestore.collection('users').doc(targetUid).get();
  return Boolean(doc.data()?.isAdmin);
}

async function isTargetModerator(targetUid: string): Promise<boolean> {
  const doc = await adminFirestore.collection('users').doc(targetUid).get();
  return Boolean(doc.data()?.isModerator);
}

async function sendBotMessage(rtdb: ReturnType<typeof getDatabase>, roomId: string, message: string) {
  await rtdb.ref(`chat/${roomId}/messages`).push({
    uid: 'BOT_HOST',
    displayName: '🎪 방장봇',
    message,
    level: 99,
    timestamp: Date.now(),
    type: 'bot',
    isBot: true,
  });
}

async function sendBotToAllRooms(rtdb: ReturnType<typeof getDatabase>, message: string) {
  await sendBotMessage(rtdb, 'main', message);
  const roomsSnap = await rtdb.ref('rooms').get();
  if (roomsSnap.exists()) {
    const rooms = roomsSnap.val() as Record<string, unknown>;
    for (const roomId of Object.keys(rooms)) {
      if (roomId !== 'main') {
        await sendBotMessage(rtdb, roomId, message);
      }
    }
  }
}

function getKickBotMessage(targetName: string, callerName: string): string {
  const msgs = [
    `🚨 ${targetName}님이 ${callerName}에 의해 강퇴되었습니다! (30분)`,
    `👋 ${targetName}님이 퇴장당했습니다! 처리자: ${callerName}`,
    `⚠️ ${targetName}님 강퇴! (${callerName}) 30분 후 재입장 가능`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getMuteBotMessage(targetName: string, callerName: string): string {
  const msgs = [
    `🔇 ${targetName}님이 ${callerName}에 의해 10분간 채팅 금지!`,
    `🤫 ${targetName}님 채팅 정지! (${callerName}) 10분 후 해제`,
    `🙊 ${targetName}님 10분 채금! 처리자: ${callerName}`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
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

    const { action, targetUid, targetDisplayName, roomId } = await req.json();
    if (!targetUid || !targetDisplayName) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
    }

    const rtdb = getDatabase();
    const chatRoomId = roomId || 'main';

    if (action === 'setModerator') {
      if (!caller.isAdmin) {
        return NextResponse.json({ error: '관리자만 운영자를 지정할 수 있습니다' }, { status: 403 });
      }
      if (await isTargetAdmin(targetUid)) {
        return NextResponse.json({ error: '관리자는 운영자로 지정할 수 없습니다' }, { status: 400 });
      }
      await adminFirestore.collection('users').doc(targetUid).set({ isModerator: true }, { merge: true });
      await sendBotToAllRooms(rtdb, `🛡️ ${targetDisplayName}님이 운영자로 임명되었습니다! 👏 (임명자: ${caller.displayName})`);
      return NextResponse.json({ success: true, message: `${targetDisplayName}님을 운영자로 지정했습니다` });
    }

    if (action === 'removeModerator') {
      if (!caller.isAdmin) {
        return NextResponse.json({ error: '관리자만 운영자를 해제할 수 있습니다' }, { status: 403 });
      }
      await adminFirestore.collection('users').doc(targetUid).set({ isModerator: false }, { merge: true });
      await sendBotToAllRooms(rtdb, `🔓 ${targetDisplayName}님의 운영자 권한이 해제되었습니다. (처리자: ${caller.displayName})`);
      return NextResponse.json({ success: true, message: `${targetDisplayName}님의 운영자를 해제했습니다` });
    }

    if (action === 'kick') {
      if (!caller.isAdmin && (await isTargetAdmin(targetUid))) {
        return NextResponse.json({ error: '관리자는 강퇴할 수 없습니다' }, { status: 403 });
      }
      if (!caller.isAdmin && (await isTargetModerator(targetUid))) {
        return NextResponse.json({ error: '운영자는 관리자만 강퇴할 수 있습니다' }, { status: 403 });
      }

      await adminFirestore.collection('kickLogs').add({
        targetUid,
        targetDisplayName,
        kickedBy: caller.uid,
        kickedByName: caller.displayName,
        kickedAt: Date.now(),
        roomId: chatRoomId,
      });

      await adminFirestore.collection('bannedUsers').doc(targetUid).set({
        uid: targetUid,
        displayName: targetDisplayName,
        bannedBy: caller.uid,
        bannedByName: caller.displayName,
        bannedAt: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000,
        reason: 'kicked',
        type: 'kick',
      });

      await rtdb.ref(`rooms/${chatRoomId}/presence/${targetUid}`).remove();
      await rtdb.ref(`rooms/main/tickets/${targetUid}`).remove();

      await rtdb.ref(`chat/${chatRoomId}/messages`).push({
        uid: 'SYSTEM',
        displayName: '시스템',
        message: `${targetDisplayName}님이 강퇴되었습니다.`,
        timestamp: Date.now(),
        type: 'system',
        isSystem: true,
      });
      await sendBotMessage(rtdb, chatRoomId, getKickBotMessage(targetDisplayName, caller.displayName));

      return NextResponse.json({ success: true, message: `${targetDisplayName}님을 강퇴했습니다 (30분)` });
    }

    if (action === 'mute') {
      if (!caller.isAdmin && (await isTargetAdmin(targetUid))) {
        return NextResponse.json({ error: '관리자는 채금할 수 없습니다' }, { status: 403 });
      }
      if (!caller.isAdmin && (await isTargetModerator(targetUid))) {
        return NextResponse.json({ error: '운영자는 관리자만 채금할 수 있습니다' }, { status: 403 });
      }

      const duration = 10 * 60 * 1000;
      await adminFirestore.collection('mutedUsers').doc(targetUid).set({
        uid: targetUid,
        displayName: targetDisplayName,
        mutedBy: caller.uid,
        mutedByName: caller.displayName,
        mutedAt: Date.now(),
        expiresAt: Date.now() + duration,
      });

      await rtdb.ref(`chat/${chatRoomId}/messages`).push({
        uid: 'SYSTEM',
        displayName: '시스템',
        message: `${targetDisplayName}님이 10분간 채팅 금지되었습니다.`,
        timestamp: Date.now(),
        type: 'system',
        isSystem: true,
      });
      await sendBotMessage(rtdb, chatRoomId, getMuteBotMessage(targetDisplayName, caller.displayName));

      return NextResponse.json({ success: true, message: `${targetDisplayName}님 채팅 금지 (10분)` });
    }

    if (action === 'unmute') {
      await adminFirestore.collection('mutedUsers').doc(targetUid).delete();
      await sendBotMessage(rtdb, chatRoomId, `🔊 ${targetDisplayName}님의 채팅 금지가 해제되었습니다! (처리자: ${caller.displayName}) 🎉`);
      return NextResponse.json({ success: true, message: `${targetDisplayName}님 채금 해제` });
    }

    if (action === 'unban') {
      await adminFirestore.collection('bannedUsers').doc(targetUid).delete();
      await sendBotMessage(rtdb, chatRoomId, `✅ ${targetDisplayName}님의 강퇴가 해제되었습니다! (처리자: ${caller.displayName})`);
      return NextResponse.json({ success: true, message: `${targetDisplayName}님 밴 해제` });
    }

    return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 });
  } catch (error) {
    console.error('Moderate error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
