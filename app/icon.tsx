import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

async function loadAnton() {
  const res = await fetch(
    "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf"
  );
  return res.arrayBuffer();
}

export default async function Icon() {
  const antonData = await loadAnton();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0D0D0D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            color: "#FF6B00",
            fontSize: 20,
            fontFamily: "Anton",
            letterSpacing: -1,
          }}
        >
          BSH
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Anton", data: antonData, style: "normal" }],
    }
  );
}
