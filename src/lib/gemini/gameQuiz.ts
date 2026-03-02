// ============================================
// AI 퀴즈 무한 생성 유틸 (Gemini 2.0 Flash)
// 게임 시작 시 1회 호출로 10라운드분 생성
// ============================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.2,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
}

export async function generateOXQuizzes(count: number) {
  const prompt = `재미있고 의외의 OX 퀴즈를 ${count}개 만들어줘.
카테고리를 섞어서: 과학, 역사, 동물, 음식, 스포츠, 지리, 연예, IT, 인체, 우주, 언어, 수학 등
쉬운 것, 어려운 것, 함정 문제, 웃긴 문제를 골고루.
이전에 나온 문제와 절대 겹치지 않게 매번 완전히 새로운 문제를 만들어.

JSON 배열로만 응답:
[{"q":"질문","a":true또는false,"explanation":"정답 해설 1줄"}]`;

  try {
    const raw = await callGemini(prompt);
    return JSON.parse(raw) as Array<{ q: string; a: boolean; explanation: string }>;
  } catch {
    return Array.from({ length: count }, (_, i) => ({
      q: `비상용 퀴즈 ${i + 1}: 물은 100도에서 끓는다`,
      a: true,
      explanation: '표준 기압에서 물의 끓는점은 100°C',
    }));
  }
}

export async function generatePriceItems(count: number) {
  const prompt = `한국에서 살 수 있는 실제 상품/서비스 ${count}개의 이름과 정확한 시장 가격을 만들어줘.
카테고리를 섞어서: 전자제품, 음식, 의류, 교통, 생활용품, 명품, 장난감, 스포츠용품 등
가격대를 다양하게: 1,000원대부터 수천만원대까지.
매번 완전히 새롭고 다양한 상품.

JSON 배열로만 응답:
[{"name":"상품명","price":숫자,"hint":"이모지1개","category":"카테고리"}]`;

  try {
    const raw = await callGemini(prompt);
    return JSON.parse(raw) as Array<{ name: string; price: number; hint: string; category: string }>;
  } catch {
    return Array.from({ length: count }, (_, i) => ({
      name: `비상용 상품 ${i + 1}`,
      price: (i + 1) * 10000,
      hint: '📦',
      category: '기타',
    }));
  }
}

export async function generateBombQuizzes(count: number) {
  const prompt = `빠르게 답할 수 있는 짧은 퀴즈 ${count}개를 만들어줘.
정답은 한 단어 또는 숫자 하나. 3초 안에 답할 수 있을 정도로 쉬워야 함.
카테고리: 상식, 수학, 한국어, 과학, 지리 등 골고루.
매번 완전히 다른 새로운 문제.

JSON 배열로만 응답:
[{"q":"질문","a":"정답","acceptable":["정답","대체정답"]}]`;

  try {
    const raw = await callGemini(prompt);
    return JSON.parse(raw) as Array<{ q: string; a: string; acceptable: string[] }>;
  } catch {
    return Array.from({ length: count }, (_, i) => ({
      q: `${i + 1} + ${i + 2} = ?`,
      a: String(i * 2 + 3),
      acceptable: [String(i * 2 + 3)],
    }));
  }
}

export async function generateDrawWords(count: number) {
  const prompt = `그림 그려서 맞추기 게임용 제시어 ${count}개를 만들어줘.
조건: 그림으로 표현 가능한 것, 너무 쉽지도 너무 어렵지도 않게.
카테고리를 섞어서: 동물, 음식, 직업, 사물, 장소, 행동, 캐릭터 등.
난이도도 섞어서: 쉬운 것(사과,고양이), 보통(소방차,피아노), 어려운 것(중력,우정).
매번 완전히 다른 새로운 단어.

JSON 배열로만 응답:
[{"word":"제시어","category":"카테고리","difficulty":"easy|medium|hard"}]`;

  try {
    const raw = await callGemini(prompt);
    return JSON.parse(raw) as Array<{ word: string; category: string; difficulty: string }>;
  } catch {
    const fallback = ['고양이', '자동차', '피자', '우산', '로봇', '나무', '비행기', '기타', '선풍기', '축구'];
    return fallback.slice(0, count).map((w) => ({ word: w, category: '기본', difficulty: 'easy' }));
  }
}

export async function generateTypingSentences(count: number) {
  const prompt = `타이핑 대결용 한국어 문장 ${count}개를 만들어줘.
조건: 15~30자 사이, 재미있거나 명언이나 속담이나 유행어 등 다양하게.
매번 완전히 새로운 문장.

JSON 배열로만 응답:
["문장1","문장2",...]`;

  try {
    const raw = await callGemini(prompt);
    return JSON.parse(raw) as string[];
  } catch {
    return Array.from({ length: count }, (_, i) => `비상용 타이핑 문장 ${i + 1}번입니다`);
  }
}
