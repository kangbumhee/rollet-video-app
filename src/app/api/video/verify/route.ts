import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, adminFirestore } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "인증이 필요합니다." }, { status: 401 });
    }

    const { roomId, watchedSeconds, totalDuration, watchPercent } = await req.json();
    if (!roomId) {
      return NextResponse.json({ success: false, error: "필수 파라미터 누락" }, { status: 400 });
    }

    if (watchPercent < 85) {
      return NextResponse.json({ success: false, error: "영상을 90% 이상 시청해야 합니다." }, { status: 400 });
    }

    await adminFirestore.collection("videoWatchLogs").add({
      uid: user.uid,
      roomId,
      watchedSeconds: watchedSeconds || 0,
      totalDuration: totalDuration || 0,
      watchPercent: watchPercent || 0,
      verified: true,
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true, message: "시청 인증 완료, 참가 티켓 발급" });
  } catch (error) {
    console.error("Video verify error:", error);
    return NextResponse.json({ success: false, error: "서버 오류" }, { status: 500 });
  }
}
