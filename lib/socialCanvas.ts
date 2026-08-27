// Helpers Canvas partagés entre les différents générateurs d'images
// réseaux sociaux (Top Leaders, Récap de match, Carrousel joueur...).
// Format standard : story/post Instagram portrait 1080x1350 (ratio 4:5).

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;
export const PADDING = 64;

export const COLORS = {
  orange: "#FF6B00",
  gold: "#FFD60A",
  black: "#0D0D0D",
  white: "#ffffff",
};

export async function loadBrandFonts() {
  try {
    await document.fonts.load("900 80px Anton");
    await document.fonts.load("700 30px Montserrat");
    await document.fonts.ready;
  } catch {
    // fallback silencieux sur une police système si Anton/Montserrat ne chargent pas
  }
}

export function paintBackground(
  ctx: CanvasRenderingContext2D,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT
) {
  ctx.fillStyle = COLORS.black;
  ctx.fillRect(0, 0, width, height);

  const glow1 = ctx.createRadialGradient(150, 200, 0, 150, 200, 500);
  glow1.addColorStop(0, "rgba(255,107,0,0.16)");
  glow1.addColorStop(1, "rgba(255,107,0,0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  const glow2 = ctx.createRadialGradient(
    width - 150,
    height - 250,
    0,
    width - 150,
    height - 250,
    500
  );
  glow2.addColorStop(0, "rgba(255,214,10,0.10)");
  glow2.addColorStop(1, "rgba(255,214,10,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);
}

export async function paintCourtPattern(
  ctx: CanvasRenderingContext2D,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
  alpha = 0.06
) {
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, width / 2 - 700, height / 2 - 700, 1400, 1400);
      ctx.restore();
      resolve();
    };
    img.onerror = () => resolve();
    img.src = "/court-pattern.svg";
  });
}

export function paintWordmarkHeader(
  ctx: CanvasRenderingContext2D,
  contextLabel: string,
  width = CANVAS_WIDTH
) {
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.orange;
  ctx.font = "700 30px Montserrat, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("BALLSOHARD", PADDING, 90);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 26px Montserrat, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(contextLabel, width - PADDING, 90);
}

// Header compact façon "tableau de données" : un kicker en haut à gauche
// (ex: "CLASSEMENT PLAYOFFS"), et à droite le contexte ligue + un petit
// badge rond BSH — plus dense que paintWordmarkHeader, à utiliser par défaut.
export function paintCompactHeader(
  ctx: CanvasRenderingContext2D,
  kickerLabel: string,
  contextLabel: string,
  width = CANVAS_WIDTH
) {
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.orange;
  ctx.font = "800 22px Montserrat, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(kickerLabel, PADDING, 52);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 20px Montserrat, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(contextLabel, width - PADDING - 56, 48);

  const badgeCx = width - PADDING - 24;
  const badgeCy = 40;
  ctx.beginPath();
  ctx.arc(badgeCx, badgeCy, 22, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = COLORS.orange;
  ctx.font = "900 16px Anton, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BSH", badgeCx, badgeCy + 1);
  ctx.textBaseline = "alphabetic";
}

export function paintFooter(
  ctx: CanvasRenderingContext2D,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
  label = "@ballsohardx2"
) {
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 20px Montserrat, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, width / 2, height - 40);
}

// Petit indicateur de slide ("1/3") pour les carrousels, en haut à droite
// sous le contexte de ligue.
export function paintSlideIndicator(
  ctx: CanvasRenderingContext2D,
  index: number,
  total: number,
  width = CANVAS_WIDTH
) {
  if (total <= 1) return;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 18px Montserrat, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${index + 1}/${total}`, width - PADDING, 84);
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Récupère les PNG (dataURL) d'une liste de canvases pour un export en lot (zip).
export function canvasesToPngDataUrls(canvases: (HTMLCanvasElement | null)[]) {
  return canvases
    .filter((c): c is HTMLCanvasElement => !!c)
    .map((c) => c.toDataURL("image/png"));
}
