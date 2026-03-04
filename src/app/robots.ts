import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const SITE_URL = "https://partyplay.kr";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/room/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt"],
        disallow: ["/api/", "/room/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/llms.txt"],
        disallow: ["/api/", "/room/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/llms.txt"],
        disallow: ["/api/", "/room/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt"],
        disallow: ["/api/", "/room/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
