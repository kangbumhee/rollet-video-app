export async function GET() {
  const SITE_URL = "https://partyplay.kr";
  const lines = [
    "# PartyPlay",
    "> 실시간 파티게임 플랫폼 - 친구들과 함께하는 무료 온라인 게임",
    "",
    "## 사이트 소개",
    "PartyPlay는 브라우저에서 바로 즐기는 실시간 멀티플레이 파티 게임 플랫폼입니다.",
    "회원가입 후 방에 입장하면 다른 유저들과 함께 다양한 게임을 즐길 수 있습니다.",
    "모든 게임은 무료이며, 경품 이벤트도 24시간 자동으로 운영됩니다.",
    "",
    "## 주요 기능",
    "정규 게임 10종: 그림 맞추기, 라인 러너, 빅 룰렛, 타이핑 배틀, 무기 강화, 가격 맞추기, OX 서바이벌, 운명의 경매, 눈치 게임, 퀵 터치.",
    "미니 게임 30종: 코인 플립, 슬롯머신, 행운의 문 등.",
    "경품: 메인 경품방 30분마다 자동 게임, 1등 실물 경품.",
    "",
    "## 기술 정보",
    "플랫폼: 웹 브라우저. 가격: 무료. 언어: 한국어. URL: " + SITE_URL,
    "",
    "## 페이지 구조",
    "/ : 메인. /login : 로그인. /mypage : 마이페이지. /room/main : 메인 경품방. /room/[id] : 파티방.",
  ];
  const content = lines.join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
