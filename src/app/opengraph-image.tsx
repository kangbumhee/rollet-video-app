import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PartyPlay - 실시간 파티게임 플랫폼";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0A0A12 0%, #1A1A2E 50%, #0A0A12 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,45,120,0.15) 0%, rgba(0,229,255,0.08) 50%, transparent 70%)",
          }}
        />
        <div style={{ fontSize: 80, marginBottom: 16 }}>🎮</div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#FF2D78",
            textShadow: "0 0 40px rgba(255,45,120,0.5)",
            marginBottom: 8,
            letterSpacing: "-2px",
          }}
        >
          PartyPlay
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 32,
          }}
        >
          실시간 파티게임 플랫폼
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {["🎲 30+ 미니게임", "🏆 실시간 대전", "🎁 경품 이벤트"].map(
            (tag) => (
              <div
                key={tag}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "24px",
                  padding: "8px 20px",
                  fontSize: 18,
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {tag}
              </div>
            )
          )}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 16,
            color: "rgba(0,229,255,0.6)",
          }}
        >
          partyplay.kr
        </div>
      </div>
    ),
    { ...size }
  );
}
