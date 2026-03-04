import type { Metadata } from "next";
import HomeClient from "./HomeClient";

const SITE_URL = "https://partyplay.kr";

export const metadata: Metadata = {
  title: "PartyPlay - 실시간 파티게임 | 친구들과 무료 온라인 게임",
  description:
    "친구들과 함께하는 실시간 파티 게임 플랫폼! 빅 룰렛, 그림 맞추기, 타이핑 배틀 등 다양한 멀티 게임을 무료로 즐기고 경품도 받아가세요. 24시간 자동 운영.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "PartyPlay",
    title: "PartyPlay - 실시간 파티게임 | 친구들과 무료 온라인 게임",
    description:
      "친구들과 함께하는 실시간 파티 게임! 빅 룰렛, 그림 맞추기, 타이핑 배틀 등 다양한 게임을 무료로 즐기고 경품도 받아가세요.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PartyPlay" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PartyPlay - 실시간 파티게임",
    description: "친구들과 실시간으로 게임하고 경품도 받아가세요!",
    images: ["/og-image.png"],
  },
};

function JsonLd() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "PartyPlay",
      url: SITE_URL,
      description:
        "친구들과 실시간으로 파티 게임을 즐기는 무료 웹 플랫폼. 빅 룰렛, 그림 맞추기, 타이핑 배틀, 경품 게임 등 20+ 게임 제공.",
      applicationCategory: "GameApplication",
      operatingSystem: "Web Browser",
      offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      inLanguage: "ko",
      author: { "@type": "Organization", name: "PartyPlay", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PartyPlay",
      url: SITE_URL,
      description: "실시간 파티게임 플랫폼",
      inLanguage: "ko",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "PartyPlay",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512x512.png`,
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
            text: "네, PartyPlay의 모든 게임은 완전 무료입니다. 회원가입 후 바로 친구들과 게임을 즐길 수 있습니다.",
          },
        },
        {
          "@type": "Question",
          name: "어떤 게임을 할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "빅 룰렛, 그림 맞추기, 타이핑 배틀, 무기 강화, OX 퀴즈 등 10가지 멀티 게임과 코인 플립, 슬롯머신, 행운의 문 등 30가지 솔로 미니게임을 즐길 수 있습니다.",
          },
        },
        {
          "@type": "Question",
          name: "모바일에서도 할 수 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "네, 앱 설치 없이 모바일 브라우저에서 바로 게임을 즐길 수 있습니다.",
          },
        },
        {
          "@type": "Question",
          name: "경품은 어떻게 받나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "메인 경품방에서 30분마다 자동 진행되는 게임에서 1등을 하면 경품을 받을 수 있습니다.",
          },
        },
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

export default function HomePage() {
  return (
    <>
      <JsonLd />
      <HomeClient />
    </>
  );
}
