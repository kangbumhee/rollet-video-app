// ============================================
// 파일: src/lib/openai/caption.ts
// 설명: GPT-4o Vision API로 경품 사진 분석
// ============================================

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface PrizeCaption {
  title: string;
  description: string;
  estimatedValue: number;
}

export async function generatePrizeDescription(imageUrl: string): Promise<PrizeCaption> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `너는 경품 이벤트 진행자야. 사진을 보고 다음을 JSON으로만 응답해:
{"title": "경품명(간결하게 15자 이내)", "description": "재미있고 흥미를 끄는 설명(2문장 이내)", "estimatedValue": 예상시장가격(숫자만, 원 단위)}
말투는 친근하고 신나는 톤으로. 반드시 JSON만 응답.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "이 경품의 정보를 알려줘" },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 200,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("AI 응답 없음");

  const parsed = JSON.parse(content) as PrizeCaption;

  // 기본값 보호
  return {
    title: parsed.title || "경품",
    description: parsed.description || "멋진 경품이 준비되어 있습니다!",
    estimatedValue: parsed.estimatedValue || 0,
  };
}
