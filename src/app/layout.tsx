import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import { NotificationBanner } from "@/components/notifications/NotificationBanner";
import InAppBrowserGuard from "@/components/InAppBrowserGuard";

export const metadata: Metadata = {
  title: "PartyPlay - 실시간 파티게임",
  description: "친구들과 함께하는 실시간 파티 게임! 다양한 미니게임과 경품까지!",
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
