// src/app/api/gemini/caption/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/firebase/admin';
import { generatePrizeCaption, enhancePrizeDescription } from '@/lib/gemini/caption';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '인증이 필요합니다.' }, { status: 401 });
    }

    const decoded = await verifyAuth(authHeader.split('Bearer ')[1]);
    if (!decoded) {
      return NextResponse.json({ success: false, error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    const { imageURL, title, description, mode } = (await req.json()) as {
      imageURL?: string;
      title?: string;
      description?: string;
      mode?: string;
    };

    if (mode === 'enhance' && title) {
      const enhanced = await enhancePrizeDescription(title, description);
      return NextResponse.json({ success: true, description: enhanced });
    }

    if (!imageURL) {
      return NextResponse.json({ success: false, error: '이미지 URL이 필요합니다.' }, { status: 400 });
    }

    const result = await generatePrizeCaption(imageURL);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Gemini caption error:', error);
    return NextResponse.json({ success: false, error: '설명 생성 실패' }, { status: 500 });
  }
}
