import { ImageResponse } from "next/og";

export const alt = "PartyPlay - 무료 파티게임 어플 | 모바일 보드게임 온라인 대전";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const EMOJIS = ["🎰", "🎨", "⌨️", "🐍", "🐦", "💣", "🧱", "🃏", "📦", "💰", "⚔️"];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#0A0A12",
          padding: 80,
        }}
      >
        {/* 왼쪽: 텍스트 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "#FF2D78",
            }}
          >
            PartyPlay
          </div>
          <div
            style={{
              fontSize: 32,
              color: "white",
            }}
          >
            무료 파티게임 어플
          </div>
          <div
            style={{
              fontSize: 20,
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            모바일 보드게임 온라인 대전
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#00E5FF",
            }}
          >
            cp1.co.kr
          </div>
        </div>

        {/* 오른쪽: 이모지 격자 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            width: 320,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {EMOJIS.map((emoji, i) => (
            <div
              key={i}
              style={{
                width: 72,
                height: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 48,
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                borderRadius: 16,
              }}
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
