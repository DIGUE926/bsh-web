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

// Photo d'équipe en fond (pleine page, recadrée en "cover"), assombrie par
// un voile + dégradé pour que le texte reste lisible par-dessus. Si l'image
// ne charge pas (URL invalide, CORS, etc.), se contente de ne rien peindre
// -- l'appelant garde le fond uni existant (paintBackground) en dessous.
export async function paintPhotoBackground(
  ctx: CanvasRenderingContext2D,
  url: string,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
  darken = 0.62
) {
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const imgRatio = img.width / img.height;
        const targetRatio = width / height;
        let drawW = width;
        let drawH = height;
        if (imgRatio > targetRatio) {
          drawH = height;
          drawW = height * imgRatio;
        } else {
          drawW = width;
          drawH = width / imgRatio;
        }
        const dx = (width - drawW) / 2;
        const dy = (height - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Voile sombre uniforme + dégradé plus marqué vers le bas (là où le
        // texte est le plus dense sur nos slides).
        ctx.fillStyle = `rgba(13,13,13,${darken})`;
        ctx.fillRect(0, 0, width, height);
        const fade = ctx.createLinearGradient(0, height * 0.35, 0, height);
        fade.addColorStop(0, "rgba(13,13,13,0)");
        fade.addColorStop(1, "rgba(13,13,13,0.75)");
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, width, height);
      } catch {
        // toDataURL/drawImage peut lever une exception "tainted canvas" si
        // l'hôte de l'image ne renvoie pas d'en-têtes CORS -- dans ce cas on
        // laisse juste le fond uni existant, pas de crash du générateur.
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

// Portrait recadré en "cover" dans une zone rectangulaire à coins arrondis
// (ex: photo d'un joueur dans une carte). Silencieux si l'image ne charge
// pas -- l'appelant garde son fallback (avatar/initiales) en dessous.
export async function paintFittedPhoto(
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 0
) {
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        ctx.save();
        roundRectPath(ctx, x, y, w, h, radius);
        ctx.clip();

        const imgRatio = img.width / img.height;
        const targetRatio = w / h;
        let drawW = w;
        let drawH = h;
        if (imgRatio > targetRatio) {
          drawH = h;
          drawW = h * imgRatio;
        } else {
          drawW = w;
          drawH = w / imgRatio;
        }
        const dx = x + (w - drawW) / 2;
        const dy = y + (h - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.restore();
      } catch {
        // "tainted canvas" si l'hôte de l'image ne renvoie pas d'en-têtes
        // CORS -- pas de crash, l'appelant garde son fallback.
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
