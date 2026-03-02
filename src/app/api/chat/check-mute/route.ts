import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ muted: false });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const muteDoc = await adminFirestore.collection('mutedUsers').doc(decoded.uid).get();

    if (!muteDoc.exists) {
      return NextResponse.json({ muted: false });
    }

    const data = muteDoc.data() as { expiresAt?: number } | undefined;
    const now = Date.now();
    const expiresAt = data?.expiresAt || 0;

    if (now > expiresAt) {
      await adminFirestore.collection('mutedUsers').doc(decoded.uid).delete();
      return NextResponse.json({ muted: false });
    }

    const remainingMinutes = Math.ceil((expiresAt - now) / 60000);
    return NextResponse.json({ muted: true, remainingMinutes });
  } catch {
    return NextResponse.json({ muted: false });
  }
}
