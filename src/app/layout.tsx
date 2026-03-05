import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import { NotificationBanner } from "@/components/notifications/NotificationBanner";
import InAppBrowserGuard from "@/components/InAppBrowserGuard";

const SITE_URL = "https://cp1.co.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "PartyPlay - 무료 파티게임 어플 | 모바일 보드게임 온라인 대전",
    template: "%s | PartyPlay - 파티게임 플랫폼",
  },
  description:
    "앱 설치 없이 브라우저에서 바로 즐기는 모바일 파티게임! 친구들과 빅 룰렛, 그림 맞추기, 타이핑 배틀, 스네이크 서바이벌 등 11종 멀티 보드게임 + 30종 미니게임을 무료로 플레이하세요. 모바일 스팀처럼 다양한 게임을 한 곳에서. 24시간 자동 운영, 경품 이벤트 상시 진행.",
  keywords: [
    "파티게임 어플",
    "파티게임 앱",
    "모바일 보드게임",
    "모바일 스팀",
    "온라인 보드게임",
    "무료 파티게임",
    "온라인 파티 게임",
    "실시간 멀티 게임",
    "무료 온라인 게임",
    "친구와 게임",
    "브라우저 게임",
    "경품 게임",
    "멀티플레이 게임",
    "웹 게임",
    "모바일 멀티게임",
    "파티 플레이",
    "PartyPlay",
    "실시간 대전 게임",
    "무료 경품",
    "2인 게임",
    "다인원 게임",
    "캐치마인드",
    "미니게임 모음",
    "보드게임 온라인",
    "보드게임 앱",
    "WePlay 대안",
  ],
  authors: [{ name: "PartyPlay Team" }],
  creator: "PartyPlay",
  publisher: "PartyPlay",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "PartyPlay",
    title: "PartyPlay - 무료 파티게임 어플 | 모바일 보드게임 대전",
    description:
      "앱 설치 없이 모바일에서 바로! 친구들과 빅 룰렛, 그림 맞추기, 타이핑 배틀 등 11종 파티게임을 무료로 즐기고 경품도 받아가세요.",
    images: [
      { url: "/og-image.png", width: 1200, height: 630, alt: "PartyPlay - 모바일 파티게임 어플" },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "PartyPlay - 무료 파티게임 어플",
    description: "친구들과 모바일로 실시간 보드게임! 앱 설치 없이 무료 플레이.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  verification: {
    google: "2MnRvSyrXHaqPgXiatFQA47AJBGLq-YwGJ-_08GD1VE",
  },

  category: "games",

  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0A0A12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <meta name="naver-site-verification" content="a24076757a73cc6273c85178570cbe562bcd9533" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-noise">
        <InAppBrowserGuard>
          <AuthProvider>
            <NotificationBanner />
            {children}
          </AuthProvider>
        </InAppBrowserGuard>
      </body>
    </html>
  );
}
