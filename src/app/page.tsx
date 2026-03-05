import type { Metadata } from "next";
import HomeClient from "./HomeClient";

const SITE_URL = "https://cp1.co.kr";

export const metadata: Metadata = {
  title: "PartyPlay - 무료 파티게임 어플 | 모바일 보드게임 온라인 대전",
  description:
    "앱 설치 없이 모바일 브라우저에서 바로 즐기는 파티게임 플랫폼! 빅 룰렛, 그림 맞추기, 타이핑 배틀, 스네이크 서바이벌 등 11종 멀티 보드게임과 30종 미니게임을 완전 무료로. 모바일 스팀처럼 다양한 게임을 한 곳에서 즐기세요.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "PartyPlay",
    title: "PartyPlay - 무료 파티게임 어플 | 모바일 보드게임",
    description:
      "친구들과 모바일로 실시간 파티게임! 빅 룰렛, 그림 맞추기, 타이핑 배틀 등 무료 보드게임 대전.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PartyPlay" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PartyPlay - 무료 파티게임 어플",
    description: "모바일 보드게임 대전! 앱 없이 브라우저에서 무료 플레이.",
    images: ["/og-image.png"],
  },
};

function JsonLd() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "PartyPlay",
      alternateName: ["파티플레이", "PartyPlay 파티게임"],
      url: SITE_URL,
      description:
        "앱 설치 없이 모바일 브라우저에서 친구들과 실시간 파티게임을 즐기는 무료 플랫폼. 빅 룰렛, 그림 맞추기, 타이핑 배틀, 스네이크 서바이벌, 플래피 배틀 등 11종 멀티 보드게임과 30종 솔로 미니게임 제공. 모바일 스팀처럼 다양한 게임을 한 곳에서.",
      applicationCategory: "GameApplication",
      applicationSubCategory: "Board Game, Party Game",
      operatingSystem: "Web Browser, Android, iOS",
      offers: { "@type": "Offer", price: "0", priceCurrency: "KRW", availability: "https://schema.org/InStock" },
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      inLanguage: "ko",
      author: { "@type": "Organization", name: "PartyPlay", url: SITE_URL },
      screenshot: `${SITE_URL}/og-image.png`,
      featureList: "실시간 멀티플레이, 경품 이벤트, 11종 파티게임, 30종 미니게임, 모바일 최적화",
      keywords: "파티게임 어플, 모바일 보드게임, 모바일 스팀, 온라인 보드게임, 무료 파티게임",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PartyPlay",
      alternateName: "파티플레이",
      url: SITE_URL,
      description: "무료 모바일 파티게임 & 보드게임 온라인 대전 플랫폼",
      inLanguage: "ko",
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "PartyPlay",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512x512.png`,
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "PartyPlay는 무료인가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "네, PartyPlay의 모든 게임은 완전 무료입니다. 앱 설치 없이 모바일 브라우저에서 바로 즐길 수 있습니다.",
          },
        },
        {
          "@type": "Question",
          name: "어떤 파티게임을 할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "빅 룰렛, 그림 맞추기(캐치마인드), 타이핑 배틀, 스네이크 서바이벌, 플래피 배틀, 폭탄 해제, 테트리스 배틀, 메모리 매치, 블라인드 경매, 가격 맞추기, 검 강화 등 11종 멀티 파티게임과 코인 플립, 슬롯머신 등 30종 솔로 미니게임을 즐길 수 있습니다.",
          },
        },
        {
          "@type": "Question",
          name: "모바일에서도 할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "네, 앱 설치 없이 모바일 브라우저(크롬, 사파리 등)에서 바로 접속해 플레이할 수 있습니다. PC에서도 가능합니다.",
          },
        },
        {
          "@type": "Question",
          name: "경품은 어떻게 받나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "메인 경품방에서 30분마다 자동으로 진행되는 게임에서 1등을 하면 경품을 받을 수 있습니다. 24시간 자동 운영됩니다.",
          },
        },
        {
          "@type": "Question",
          name: "WePlay와 뭐가 다른가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "PartyPlay는 앱 설치 없이 웹 브라우저에서 바로 플레이할 수 있고, 경품 이벤트가 24시간 자동 운영되며, 11종의 실시간 대전 게임을 제공합니다.",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "PartyPlay 파티게임 목록",
      description: "PartyPlay에서 즐길 수 있는 멀티플레이 파티게임 11종",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "빅 룰렛", description: "배수를 선택하고 룰렛을 돌려 점수를 얻는 운빨 대전 게임" },
        { "@type": "ListItem", position: 2, name: "그림 맞추기", description: "한 명이 그리면 나머지가 맞추는 캐치마인드 스타일 게임" },
        { "@type": "ListItem", position: 3, name: "타이핑 배틀", description: "주어진 문장을 가장 빠르고 정확하게 타이핑하는 속도 대전" },
        { "@type": "ListItem", position: 4, name: "스네이크 서바이벌", description: "뱀을 조종해 먹이를 먹고 점수를 겨루는 아케이드 게임" },
        { "@type": "ListItem", position: 5, name: "플래피 배틀", description: "장애물을 피하며 최고 점수를 겨루는 플래피버드 대전" },
        { "@type": "ListItem", position: 6, name: "폭탄 해제", description: "퀴즈를 맞혀 폭탄을 해제하는 서바이벌 게임" },
        { "@type": "ListItem", position: 7, name: "테트리스 배틀", description: "테트리스 실력을 겨루는 멀티플레이 대전" },
        { "@type": "ListItem", position: 8, name: "메모리 매치", description: "카드 짝 맞추기 기억력 대전 게임" },
        { "@type": "ListItem", position: 9, name: "블라인드 경매", description: "숨겨진 상자에 칩을 배팅하는 심리전 게임" },
        { "@type": "ListItem", position: 10, name: "가격 맞추기", description: "상품의 가격을 맞추는 추리 게임" },
        { "@type": "ListItem", position: 11, name: "검 강화", description: "무기를 강화하며 운을 시험하는 게임" },
      ],
    },
  ];

  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </>
  );
}

function SeoContent() {
  return (
    <div className="sr-only" aria-hidden="false">
      <h1>PartyPlay - 무료 파티게임 어플 | 모바일 보드게임 온라인 대전</h1>
      <h2>앱 설치 없이 모바일에서 즐기는 파티게임 플랫폼</h2>
      <p>
        PartyPlay는 앱 설치 없이 모바일 브라우저에서 바로 즐길 수 있는 무료 파티게임 플랫폼입니다.
        마치 모바일 스팀처럼, 다양한 게임을 한 곳에서 친구들과 실시간으로 대전할 수 있습니다.
      </p>
      <h3>11종 멀티플레이 파티게임</h3>
      <p>
        빅 룰렛, 그림 맞추기(캐치마인드), 타이핑 배틀, 스네이크 서바이벌, 플래피 배틀,
        폭탄 해제 퀴즈, 테트리스 배틀, 메모리 매치, 블라인드 경매, 가격 맞추기, 검 강화 등
        11종의 실시간 멀티 보드게임을 무료로 즐기세요.
      </p>
      <h3>30종 솔로 미니게임</h3>
      <p>
        코인 플립, 슬롯머신, 행운의 문, 하이로우 등 30종의 솔로 미니게임으로
        혼자서도 포인트를 모으고 경품에 도전하세요.
      </p>
      <h3>24시간 경품 이벤트</h3>
      <p>
        메인 경품방에서 30분마다 자동으로 게임이 진행됩니다.
        1등을 하면 실제 경품을 받을 수 있습니다. 광고 한 번 보고 무료로 참여하세요.
      </p>
      <h3>모바일 보드게임 추천</h3>
      <p>
        친구와 함께 할 모바일 보드게임을 찾고 계신가요? PartyPlay는 WePlay, 보드게임아레나 같은
        온라인 보드게임 플랫폼의 대안으로, 설치 없이 링크만 공유하면 바로 함께 플레이할 수 있습니다.
        파티게임 어플을 찾고 있다면 PartyPlay를 추천합니다.
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd />
      <SeoContent />
      <HomeClient />
    </>
  );
}
