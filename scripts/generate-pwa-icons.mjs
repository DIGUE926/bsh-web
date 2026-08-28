// One-off script: generates PWA icon PNGs (regular + maskable) matching the
// existing app/icon.tsx design (BSH wordmark, Anton font, orange on black).
// Run with: node scripts/generate-pwa-icons.mjs
import { ImageResponse } from "next/og.js";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const ORANGE = "#FF6B00";
const BLACK = "#0D0D0D";

async function loadAnton() {
  return readFile(join(process.cwd(), "public/fonts/Anton-Regular.ttf"));
}

async function render(node, size) {
  const res = new ImageResponse(node, {
    width: size,
    height: size,
    fonts: [{ name: "Anton", data: await loadAnton(), style: "normal" }],
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

// Regular icon: rounded-square dark bg, orange BSH wordmark centered (mirrors app/icon.tsx)
function regularNode(size) {
  const fontSize = Math.round(size * 0.34);
  const radius = Math.round(size * 0.18);
  return {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        background: BLACK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius,
      },
      children: {
        type: "div",
        props: {
          style: {
            color: ORANGE,
            fontSize,
            fontFamily: "Anton",
            letterSpacing: -2,
          },
          children: "BSH",
        },
      },
    },
  };
}

// Maskable icon: needs a full-bleed background with content inside the safe
// zone (inner ~80%), since OS masks can crop up to 20% off any edge.
function maskableNode(size) {
  const fontSize = Math.round(size * 0.26);
  return {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        background: BLACK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      children: {
        type: "div",
        props: {
          style: {
            color: ORANGE,
            fontSize,
            fontFamily: "Anton",
            letterSpacing: -2,
          },
          children: "BSH",
        },
      },
    },
  };
}

async function main() {
  const outDir = join(process.cwd(), "public/icons");
  await mkdir(outDir, { recursive: true });

  const jobs = [
    ["icon-192.png", regularNode(192), 192],
    ["icon-512.png", regularNode(512), 512],
    ["apple-touch-icon.png", regularNode(180), 180],
    ["maskable-192.png", maskableNode(192), 192],
    ["maskable-512.png", maskableNode(512), 512],
  ];

  for (const [name, node, size] of jobs) {
    const buf = await render(node, size);
    await writeFile(join(outDir, name), buf);
    console.log(`wrote ${name} (${buf.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
