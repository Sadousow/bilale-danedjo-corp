import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0b2e63 0%, #1a4a8e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          fontWeight: 700,
          fontSize: 110,
          color: "#ffffff",
          letterSpacing: -2,
        }}
      >
        B<span style={{ color: "#d4a017" }}>D</span>
      </div>
    ),
    { ...size }
  );
}
