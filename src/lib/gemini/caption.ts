// src/lib/gemini/caption.ts

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface CaptionResult {
  title: string;
  description: string;
  estimatedValue: number;
}

export async function generatePrizeCaption(imageURL: string): Promise<CaptionResult> {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set. Returning placeholder caption.');
    return {
      title: '경품',
      description: '경품 설명을 생성하려면 Gemini API 키를 설정하세요.',
      estimatedValue: 0,
    };
  }

  try {
    const imageResponse = await fetch(imageURL);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            {
              text: `이 이미지는 경품 추첨 이벤트에 사용될 상품 사진입니다.
다음 JSON 형식으로 정확하게 응답해주세요. JSON 외에 다른 텍스트는 포함하지 마세요.

{
  "title": "상품명 (한국어, 20자 이내)",
  "description": "상품에 대한 매력적인 설명 (한국어, 100자 이내, 이모지 포함)",
  "estimatedValue": 예상 시장가격(숫자만, 원 단위)
}

예시:
{
  "title": "에어팟 프로 2세대",
  "description": "🎧 애플의 프리미엄 무선 이어폰! 노이즈 캔슬링과 공간 음향으로 몰입감 최고!",
  "estimatedValue": 359000
}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300,
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error('Gemini returned empty response');
    }

    const parsed = JSON.parse(textContent) as {
      title?: string;
      description?: string;
      estimatedValue?: number;
    };

    return {
      title: parsed.title || '경품',
      description: parsed.description || '멋진 경품입니다!',
      estimatedValue: typeof parsed.estimatedValue === 'number' ? parsed.estimatedValue : 0,
    };
  } catch (error) {
    console.error('Gemini caption error:', error);
    return {
      title: '경품',
      description: '상품 설명을 자동 생성하지 못했습니다. 직접 입력해주세요.',
      estimatedValue: 0,
    };
  }
}

export async function enhancePrizeDescription(title: string, rawDescription?: string): Promise<string> {
  if (!GEMINI_API_KEY) return rawDescription || '';

  try {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `"${title}" 상품에 대한 매력적인 경품 추첨 이벤트용 설명을 한국어로 작성해주세요.
${rawDescription ? `참고 정보: ${rawDescription}` : ''}
100자 이내, 이모지를 적절히 사용하고, 참가자의 관심을 끌 수 있게 작성하세요.
설명 텍스트만 응답하세요.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || rawDescription || '';
  } catch {
    return rawDescription || '';
  }
}
