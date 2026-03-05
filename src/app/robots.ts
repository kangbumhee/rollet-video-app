import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/games", "/games/", "/guide"],
        disallow: ["/api/", "/admin/", "/room/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt", "/games"],
        disallow: ["/api/", "/room/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt", "/games"],
        disallow: ["/api/", "/room/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/llms.txt", "/games"],
        disallow: ["/api/", "/room/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/games"],
        disallow: ["/api/", "/room/"],
      },
    ],
    sitemap: "https://cp1.co.kr/sitemap.xml",
  };
}
