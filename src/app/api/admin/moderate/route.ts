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

async function sendBotMessage(rtdb: ReturnType<typeof getDatabase>, message: string) {
  await rtdb.ref('chat/main/messages').push({
    uid: 'BOT_HOST',
    displayName: '🎪 방장봇',
    text: message,
    level: 99,
    timestamp: Date.now(),
    type: 'bot',
    isBot: true,
  });
}

function getKickBotMessage(name: string): string {
  const msgs = [
    `🚨 ${name}님이 퇴장당했습니다! 규칙을 지켜주세요~`,
    `👋 ${name}님 안녕히 가세요~ 30분 후에 다시 만나요!`,
    `⚠️ ${name}님이 강퇴되었습니다. 건전한 참여 부탁드립니다!`,
    `🚪 ${name}님이 방에서 내보내졌습니다! 다음엔 함께해요~`,
    `😤 규칙 위반! ${name}님은 잠시 쉬다 오세요~`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getMuteBotMessage(name: string): string {
  const msgs = [
    `🔇 ${name}님 잠시 조용히~ 10분간 채팅이 금지됩니다!`,
    `🤫 쉿! ${name}님은 10분간 채팅 쿨타임이에요~`,
    `📢 ${name}님 채팅 잠시 멈춤! 10분 후에 다시 수다 떨어요~`,
    `🙊 ${name}님 입에 지퍼! 10분만 참아주세요~`,
    `⏸️ ${name}님 채팅 일시정지! 잠시 후 돌아와요~`,
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
      await sendBotMessage(rtdb, `🛡️ ${targetDisplayName}님이 운영자로 임명되었습니다! 앞으로 잘 부탁드려요~ 👏`);
      return NextResponse.json({ success: true, message: `${targetDisplayName}님을 운영자로 지정했습니다` });
    }

    if (action === 'removeModerator') {
      if (!caller.isAdmin) {
        return NextResponse.json({ error: '관리자만 운영자를 해제할 수 있습니다' }, { status: 403 });
      }
      await adminFirestore.collection('users').doc(targetUid).set({ isModerator: false }, { merge: true });
      await sendBotMessage(rtdb, `🔓 ${targetDisplayName}님의 운영자 권한이 해제되었습니다.`);
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
      await sendBotMessage(rtdb, getKickBotMessage(targetDisplayName));

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
      await sendBotMessage(rtdb, getMuteBotMessage(targetDisplayName));

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
      await sendBotMessage(rtdb, `🔊 ${targetDisplayName}님의 채팅 금지가 해제되었습니다! 다시 대화에 참여해주세요~ 🎉`);

      return NextResponse.json({ success: true, message: `${targetDisplayName}님 채팅 금지 해제` });
    }

    return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 });
  } catch (error) {
    console.error('Moderate error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

