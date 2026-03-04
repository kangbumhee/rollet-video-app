import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import { NotificationBanner } from "@/components/notifications/NotificationBanner";
import InAppBrowserGuard from "@/components/InAppBrowserGuard";

const SITE_URL = "https://partyplay.kr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "PartyPlay - 실시간 파티게임 | 친구들과 무료 온라인 게임",
    template: "%s | PartyPlay",
  },
  description:
    "친구들과 함께하는 실시간 파티 게임 플랫폼! 빅 룰렛, 그림 맞추기, 타이핑 배틀 등 다양한 멀티플레이 게임과 솔로 미니게임을 무료로 즐기고, 경품도 받아가세요. 24시간 자동 운영.",
  keywords: [
    "파티 게임",
    "온라인 파티 게임",
    "실시간 멀티 게임",
    "무료 온라인 게임",
    "친구와 게임",
    "브라우저 게임",
    "경품 게임",
    "미니 게임",
    "파티 플레이",
    "PartyPlay",
    "웹 게임",
    "모바일 게임",
    "실시간 대전 게임",
    "무료 경품",
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
    title: "PartyPlay - 실시간 파티게임 | 친구들과 무료 온라인 게임",
    description:
      "친구들과 함께하는 실시간 파티 게임! 빅 룰렛, 그림 맞추기, 타이핑 배틀 등 다양한 게임을 무료로 즐기고 경품도 받아가세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PartyPlay - 실시간 파티게임 플랫폼",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "PartyPlay - 실시간 파티게임",
    description: "친구들과 실시간으로 게임하고 경품도 받아가세요!",
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
    google: "YOUR_GOOGLE_VERIFICATION_CODE",
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
