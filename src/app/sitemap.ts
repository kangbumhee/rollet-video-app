import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const SITE_URL = "https://cp1.co.kr";
  const now = new Date();

  const gamePages = [
    "big-roulette",
    "draw-guess",
    "typing-battle",
    "slither-battle",
    "flappy-battle",
    "bomb-survival",
    "tetris-battle",
    "memory-match",
    "blind-auction",
    "price-guess",
    "weapon-forge",
  ];

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/mypage`, lastModified: now, changeFrequency: "weekly", priority: 0.3 },
    { url: `${SITE_URL}/games`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...gamePages.map((slug) => ({
      url: `${SITE_URL}/games/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
