import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, adminFirestore } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "인증이 필요합니다." }, { status: 401 });
    }

    const { roomId, watchDuration } = await req.json();
    if (!roomId || !watchDuration) {
      return NextResponse.json({ success: false, error: "필수 파라미터 누락" }, { status: 400 });
    }

    if (watchDuration < 10) {
      return NextResponse.json({ success: false, error: "광고를 끝까지 시청해주세요." }, { status: 400 });
    }

    // 광고 시청 로그 저장
    await adminFirestore.collection("adLogs").add({
      uid: user.uid,
      roomId,
      watchDuration,
      verified: true,
      createdAt: Date.now(),
    });

    return NextResponse.json({ success: true, message: "참가 티켓 발급 완료" });
  } catch (error) {
    console.error("Ad verify error:", error);
    return NextResponse.json({ success: false, error: "서버 오류" }, { status: 500 });
  }
}
