import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
            fontSize: 18,
            fontWeight: 900,
            fontFamily: "sans-serif",
            letterSpacing: -1,
          }}
        >
          BSH
        </div>
      </div>
    ),
    { ...size }
  );
}
