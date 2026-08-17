import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadAnton() {
  const res = await fetch(
    "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf"
  );
  return res.arrayBuffer();
}

export default async function OGImage() {
  const antonData = await loadAnton();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0D0D0D",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "#FF6B00",
            fontSize: 180,
            fontFamily: "Anton",
            letterSpacing: -2,
          }}
        >
          BSH
        </div>
        <div
          style={{
            color: "#FFD60A",
            fontSize: 32,
            fontFamily: "Anton",
            marginTop: 10,
            letterSpacing: 2,
          }}
        >
          BALLSOHARD
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: 22,
            fontFamily: "sans-serif",
            marginTop: 24,
          }}
        >
          Stats basketball multi-ligues en Haïti
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Anton", data: antonData, style: "normal" }],
    }
  );
}
