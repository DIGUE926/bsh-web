"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import JSZip from "jszip";
import {
  CANVAS_WIDTH as WIDTH,
  CANVAS_HEIGHT as HEIGHT,
  PADDING,
  COLORS,
  loadBrandFonts,
  paintBackground,
  paintCourtPattern,
  paintCompactHeader,
  paintFooter,
  paintSlideIndicator,
  downloadCanvasPng,
} from "@/lib/socialCanvas";

type Competition = "season" | "playoffs";
type League = { id: string; slug: string; name: string };
type PlayerRow = {
  player_id: string;
  player_name: string;
  team_name: string | null;
  games_played: number | null;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  spg: number | null;
  bpg: number | null;
  ts_pct?: number | null;
  pir: number | null;
};

const STAT_GRID: { key: keyof PlayerRow; label: string; suffix: string }[] = [
  { key: "ppg", label: "POINTS", suffix: "/MATCH" },
  { key: "rpg", label: "REBONDS", suffix: "/MATCH" },
  { key: "apg", label: "PASSES", suffix: "/MATCH" },
  { key: "spg", label: "INTERCEPTIONS", suffix: "/MATCH" },
  { key: "bpg", label: "CONTRES", suffix: "/MATCH" },
  { key: "pir", label: "IMPACT (PIR)", suffix: "" },
];

// Les 5 stats utilisées pour la comparaison vs moyenne ligue + le radar profil.
const PROFILE_STATS: { key: "ppg" | "rpg" | "apg" | "spg" | "bpg"; label: string; short: string }[] = [
  { key: "ppg", label: "POINTS", short: "PTS" },
  { key: "rpg", label: "REBONDS", short: "REB" },
  { key: "apg", label: "PASSES", short: "AST" },
  { key: "spg", label: "INTERCEPTIONS", short: "STL" },
  { key: "bpg", label: "CONTRES", short: "BLK" },
];

const SLIDE_COUNT = 5;

export default function PlayerCarouselGenerator() {
  const [competition, setCompetition] = useState<Competition>("season");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const canvasRefs = [
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
  ];
  const supabase = createClient();

  useEffect(() => {
    async function loadLeagues() {
      const { data } = await supabase.from("leagues").select("id, slug, name").order("name");
      if (data && data.length > 0) {
        setLeagues(data);
        setLeagueId(data[0].id);
      }
    }
    loadLeagues();
  }, [supabase]);

  useEffect(() => {
    if (!leagueId) return;
    const league = leagues.find((l) => l.id === leagueId);
    if (!league) return;
    async function loadPlayers() {
      const table = competition === "season" ? "global_rankings" : "playoff_player_totals";
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq("league_slug", league!.slug)
        .order("pir", { ascending: false, nullsFirst: false })
        .limit(100);
      const rows = (data ?? []) as PlayerRow[];
      setPlayers(rows);
      setPlayerId(rows[0]?.player_id ?? "");
    }
    loadPlayers();
  }, [leagueId, competition, leagues, supabase]);

  // Moyenne de la ligue pour chaque stat (à partir des joueurs déjà chargés).
  function leagueAverage(stat: keyof PlayerRow): number {
    const values = players.map((p) => p[stat]).filter((v): v is number => v != null);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + Number(b), 0) / values.length;
  }

  // Percentile du joueur (0-100) sur une stat donnée, au sein de sa ligue.
  function percentile(stat: keyof PlayerRow, value: number | null): number {
    if (value == null) return 0;
    const values = players.map((p) => p[stat]).filter((v): v is number => v != null);
    if (values.length <= 1) return 50;
    const below = values.filter((v) => Number(v) <= value).length;
    return Math.round((below / values.length) * 100);
  }

  async function generate() {
    setError(null);
    setLoading(true);
    setReady(false);

    const player = players.find((p) => p.player_id === playerId);
    if (!player) {
      setError("Sélectionne un joueur.");
      setLoading(false);
      return;
    }

    const league = leagues.find((l) => l.id === leagueId);
    const contextLabel = `${(league?.slug ?? "").toUpperCase()} · ${
      competition === "season" ? "SAISON RÉGULIÈRE" : "PLAYOFFS"
    }`;

    await Promise.all([
      drawHookSlide(player, contextLabel),
      drawStatsSlide(player, contextLabel),
      drawComparisonSlide(player, contextLabel),
      drawRadarSlide(player, contextLabel),
      drawOutroSlide(player, contextLabel),
    ]);

    setLoading(false);
    setReady(true);
    setActiveSlide(0);
  }

  async function drawHookSlide(player: PlayerRow, contextLabel: string) {
    const canvas = canvasRefs[0].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, "JOUEUR À SUIVRE", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 0, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    // Équipe (kicker)
    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 20px Montserrat, sans-serif";
    ctx.fillText((player.team_name ?? "").toUpperCase(), PADDING, 115);

    // Nom du joueur, aligné à gauche comme le reste des slides
    ctx.fillStyle = COLORS.white;
    ctx.font = "900 66px Anton, sans-serif";
    const nameLines = wrapLines(ctx, player.player_name.toUpperCase(), WIDTH - PADDING * 2);
    let ny = 180;
    nameLines.forEach((line) => {
      ctx.fillText(line, PADDING, ny);
      ny += 66;
    });

    const dividerY = ny + 14;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, dividerY);
    ctx.lineTo(WIDTH - PADDING, dividerY);
    ctx.stroke();

    // Accroche — met en avant le PPG, chiffre le plus parlant pour capter l'attention.
    const ppgValue = player.ppg != null ? Number(player.ppg).toFixed(1) : null;

    const hookY = dividerY + 60;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 22px Anton, sans-serif";
    ctx.fillText("│", PADDING, hookY);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 24px Montserrat, sans-serif";
    const hookText = ppgValue
      ? `${ppgValue} points de moyenne cette saison — un profil qui capte l'œil.`
      : `Zoom sur un joueur qui pèse dans le jeu de ${(player.team_name ?? "son équipe").toUpperCase()}.`;
    const hookLines = wrapLines(ctx, hookText, WIDTH - PADDING * 2 - 24);
    let hy = hookY;
    hookLines.forEach((line) => {
      ctx.fillText(line, PADDING + 20, hy);
      hy += 32;
    });

    // Invite à swiper, en bas de slide
    const swipeY = HEIGHT - 150;
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 22px Montserrat, sans-serif";
    ctx.fillText("GLISSE POUR VOIR SES STATS →", PADDING, swipeY);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawStatsSlide(player: PlayerRow, contextLabel: string) {
    const canvas = canvasRefs[1].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT);
    paintCompactHeader(ctx, "PROFIL STATISTIQUE", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 1, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.white;
    ctx.font = "900 40px Anton, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(player.player_name.toUpperCase(), PADDING, 105);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, 128);
    ctx.lineTo(WIDTH - PADDING, 128);
    ctx.stroke();

    // Grille de stats 2 colonnes
    const cols = 2;
    const gap = 18;
    const cardW = (WIDTH - PADDING * 2 - gap) / cols;
    const cardH = 140;
    const startY = 160;

    STAT_GRID.forEach((stat, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = PADDING + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, cardW, cardH, 14);
      ctx.fill();
      ctx.stroke();

      const raw = player[stat.key];
      const val = raw != null ? Number(raw).toFixed(1) : "-";

      ctx.fillStyle = COLORS.orange;
      ctx.font = "900 48px Anton, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(val, x + 22, y + 74);

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "700 15px Montserrat, sans-serif";
      ctx.fillText(stat.label, x + 22, y + 104);
    });

    const gpY = startY + Math.ceil(STAT_GRID.length / cols) * (cardH + gap) + 26;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 18px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `${player.games_played ?? "-"} match${(player.games_played ?? 0) > 1 ? "s" : ""} joué${(player.games_played ?? 0) > 1 ? "s" : ""}`,
      WIDTH / 2,
      gpY
    );

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  // Slide "vs moyenne ligue" : une barre par stat, joueur vs moyenne, avec % d'écart.
  async function drawComparisonSlide(player: PlayerRow, contextLabel: string) {
    const canvas = canvasRefs[2].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT);
    paintCompactHeader(ctx, "VS MOYENNE LIGUE", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 2, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.white;
    ctx.font = "900 32px Anton, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("LUI VS LA MOYENNE LIGUE", PADDING, 100);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 17px Montserrat, sans-serif";
    ctx.fillText(`Comparé aux ${players.length} joueurs de la ligue`, PADDING, 124);

    const rows = PROFILE_STATS.map((stat) => {
      const value = Number(player[stat.key] ?? 0);
      const avg = leagueAverage(stat.key);
      const diffPct = avg > 0 ? Math.round(((value - avg) / avg) * 100) : 0;
      return { ...stat, value, avg, diffPct };
    });

    const maxVal = Math.max(...rows.map((r) => Math.max(r.value, r.avg)), 1);
    const barAreaX = PADDING + 160;
    const barAreaW = WIDTH - PADDING - barAreaX - 110;
    const rowH = 128;
    const startY = 165;

    rows.forEach((r, i) => {
      const y = startY + i * rowH;
      const isAbove = r.diffPct >= 0;

      ctx.fillStyle = COLORS.white;
      ctx.font = "800 19px Montserrat, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(r.label, PADDING, y + 17);

      // Barre "moyenne ligue" (fond)
      const avgW = (r.avg / maxVal) * barAreaW;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      roundRect(ctx, barAreaX, y, barAreaW, 20, 10);
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(barAreaX + avgW, y - 4);
      ctx.lineTo(barAreaX + avgW, y + 24);
      ctx.stroke();

      // Barre joueur (au-dessus)
      const valW = (r.value / maxVal) * barAreaW;
      ctx.fillStyle = isAbove ? COLORS.orange : "rgba(255,90,90,0.85)";
      roundRect(ctx, barAreaX, y + 28, Math.max(valW, 5), 20, 10);
      ctx.fill();

      // Valeurs
      ctx.fillStyle = COLORS.white;
      ctx.font = "900 20px Anton, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(r.value.toFixed(1), barAreaX + barAreaW + 14, y + 45);

      ctx.fillStyle = isAbove ? COLORS.gold : "rgba(255,120,120,0.9)";
      ctx.font = "800 15px Montserrat, sans-serif";
      ctx.fillText(`${isAbove ? "+" : ""}${r.diffPct}%`, barAreaX + barAreaW + 14, y + 62);

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "600 13px Montserrat, sans-serif";
      ctx.fillText(`moy. ${r.avg.toFixed(1)}`, barAreaX, y + 88);
    });

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 15px Montserrat, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("│ = moyenne de la ligue", PADDING, HEIGHT - 90);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  // Slide radar : silhouette du profil du joueur (percentile par stat dans sa ligue),
  // avec la moyenne ligue en référence (pentagone à 50%).
  async function drawRadarSlide(player: PlayerRow, contextLabel: string) {
    const canvas = canvasRefs[3].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, "PROFIL DE JOUEUR", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 3, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.white;
    ctx.font = "900 32px Anton, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(player.player_name.toUpperCase(), PADDING, 100);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 17px Montserrat, sans-serif";
    ctx.fillText("Forces et faiblesses relatives", PADDING, 124);

    const n = PROFILE_STATS.length;
    const cx = WIDTH / 2;
    const cy = 520;
    const maxR = 260;
    const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

    // Grille (anneaux à 25/50/75/100%)
    [0.25, 0.5, 0.75, 1].forEach((frac) => {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = angleFor(i % n);
        const r = maxR * frac;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Axes
    PROFILE_STATS.forEach((_, i) => {
      const a = angleFor(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(a), cy + maxR * Math.sin(a));
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Référence "moyenne ligue" (pentagone régulier à 50%)
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = angleFor(i % n);
      const px = cx + maxR * 0.5 * Math.cos(a);
      const py = cy + maxR * 0.5 * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Silhouette du joueur (percentile par stat)
    const pcts = PROFILE_STATS.map((s) => percentile(s.key, player[s.key]));
    ctx.beginPath();
    pcts.forEach((pct, i) => {
      const a = angleFor(i);
      const r = maxR * (pct / 100);
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(255,107,0,0.28)";
    ctx.fill();
    ctx.strokeStyle = COLORS.orange;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Points + labels
    PROFILE_STATS.forEach((s, i) => {
      const a = angleFor(i);
      const pct = pcts[i];
      const r = maxR * (pct / 100);
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);

      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.gold;
      ctx.fill();

      const labelR = maxR + 46;
      const lx = cx + labelR * Math.cos(a);
      const ly = cy + labelR * Math.sin(a);
      ctx.fillStyle = COLORS.white;
      ctx.font = "800 17px Montserrat, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.short, lx, ly - 7);

      const val = player[s.key];
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "600 13px Montserrat, sans-serif";
      ctx.fillText(val != null ? Number(val).toFixed(1) : "-", lx, ly + 11);
    });

    // Callouts force / faiblesse — on parle en valeur brute (ex: PPG), pas en percentile
    const sorted = PROFILE_STATS.map((s, i) => ({ ...s, pct: pcts[i], val: player[s.key] })).sort(
      (a, b) => b.pct - a.pct
    );
    const strength = sorted[0];
    const weakness = sorted[sorted.length - 1];
    const fmt = (v: number | null) => (v != null ? Number(v).toFixed(1) : "-");

    const calloutY = HEIGHT - 190;
    ctx.textBaseline = "alphabetic";

    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 19px Anton, sans-serif";
    ctx.fillText("POINT FORT", PADDING, calloutY);
    ctx.fillStyle = COLORS.white;
    ctx.font = "700 18px Montserrat, sans-serif";
    ctx.fillText(`${strength.label} — ${fmt(strength.val)}`, PADDING, calloutY + 26);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,120,120,0.9)";
    ctx.font = "900 19px Anton, sans-serif";
    ctx.fillText("À TRAVAILLER", WIDTH - PADDING, calloutY);
    ctx.fillStyle = COLORS.white;
    ctx.font = "700 18px Montserrat, sans-serif";
    ctx.fillText(`${weakness.label} — ${fmt(weakness.val)}`, WIDTH - PADDING, calloutY + 26);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawOutroSlide(player: PlayerRow, contextLabel: string) {
    const canvas = canvasRefs[4].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, "EN RÉSUMÉ", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 4, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 20px Montserrat, sans-serif";
    ctx.fillText((player.team_name ?? "").toUpperCase(), PADDING, 115);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 52px Anton, sans-serif";
    const lines = wrapLines(ctx, player.player_name.toUpperCase(), WIDTH - PADDING * 2);
    let ny = 172;
    lines.forEach((line) => {
      ctx.fillText(line, PADDING, ny);
      ny += 54;
    });

    const dividerY = ny + 14;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, dividerY);
    ctx.lineTo(WIDTH - PADDING, dividerY);
    ctx.stroke();

    // Ligne de résumé — en chiffres parlants (PPG/REB/AST), pas en PIR ni percentile
    const ppg = player.ppg != null ? Number(player.ppg).toFixed(1) : "-";
    const rpg = player.rpg != null ? Number(player.rpg).toFixed(1) : "-";
    const apg = player.apg != null ? Number(player.apg).toFixed(1) : "-";

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 20px Montserrat, sans-serif";
    const recapText = `Cette saison : ${ppg} points, ${rpg} rebonds et ${apg} passes de moyenne par match.`;
    const recapLines = wrapLines(ctx, recapText, WIDTH - PADDING * 2);
    let ry = dividerY + 40;
    recapLines.forEach((line) => {
      ctx.fillText(line, PADDING, ry);
      ry += 28;
    });

    // Carte CTA en bas, pas centrée pleine hauteur
    const ctaY = HEIGHT - 280;
    const ctaH = 130;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.strokeStyle = "rgba(255,214,10,0.25)";
    ctx.lineWidth = 1;
    roundRect(ctx, PADDING, ctaY, WIDTH - PADDING * 2, ctaH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 18px Montserrat, sans-serif";
    ctx.fillText("PLUS D'ANALYSES SUR", PADDING + 28, ctaY + 48);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 40px Anton, sans-serif";
    ctx.fillText("@BALLSOHARDX2", PADDING + 28, ctaY + 96);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  // Découpe un texte en lignes qui tiennent dans maxWidth (ne dessine rien).
  function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(
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

  function downloadSlide(index: number) {
    const canvas = canvasRefs[index].current;
    if (!canvas) return;
    const player = players.find((p) => p.player_id === playerId);
    const name = (player?.player_name ?? "joueur").replace(/\s+/g, "-");
    downloadCanvasPng(canvas, `bsh-${name}-slide${index + 1}.png`);
  }

  async function downloadAllAsZip() {
    const player = players.find((p) => p.player_id === playerId);
    const name = (player?.player_name ?? "joueur").replace(/\s+/g, "-");
    const zip = new JSZip();

    canvasRefs.forEach((ref, i) => {
      if (!ref.current) return;
      const dataUrl = ref.current.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      zip.file(`bsh-${name}-slide${i + 1}.png`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bsh-carrousel-${name}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const SLIDE_LABELS = ["Accroche", "Stats", "Vs moyenne", "Profil (radar)", "Outro"];

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        CARROUSEL JOUEUR
      </h1>
      <p className="text-sm text-white/50 mb-6">
        Génère un carrousel Instagram de 5 slides façon analyse NBA : accroche, stats brutes, comparaison à la
        moyenne de la ligue, profil radar (forces/faiblesses), outro.
      </p>

      <div className="flex flex-wrap gap-4 mb-6 max-w-2xl">
        <div>
          <label className="block text-sm text-white/60 mb-1">Ligue</label>
          <select
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Compétition</label>
          <select
            value={competition}
            onChange={(e) => setCompetition(e.target.value as Competition)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            <option value="season">Saison régulière</option>
            <option value="playoffs">Playoffs</option>
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm text-white/60 mb-1">Joueur</label>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {players.map((p) => (
              <option key={p.player_id} value={p.player_id}>
                {p.player_name} — {p.team_name}
              </option>
            ))}
          </select>
          {players.length === 0 && (
            <p className="text-xs text-white/40 mt-1">Aucune donnée pour cette combinaison.</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={generate}
          disabled={loading || !playerId}
          className="bg-bsh-orange text-black font-bold rounded-lg px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Génération..." : "Générer le carrousel"}
        </button>
        {ready && (
          <>
            <button
              onClick={() => downloadSlide(activeSlide)}
              className="bg-white/10 text-white font-bold rounded-lg px-5 py-2.5 hover:bg-white/20 transition-colors"
            >
              Télécharger cette slide
            </button>
            <button
              onClick={downloadAllAsZip}
              className="bg-white/10 text-white font-bold rounded-lg px-5 py-2.5 hover:bg-white/20 transition-colors"
            >
              Télécharger le carrousel (.zip)
            </button>
          </>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {ready && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {SLIDE_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                activeSlide === i ? "bg-bsh-orange text-black" : "bg-white/5 text-white/60"
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
      )}

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 inline-block">
        {[0, 1, 2, 3, 4].map((i) => (
          <canvas
            key={i}
            ref={canvasRefs[i]}
            width={WIDTH}
            height={HEIGHT}
            className="max-w-full h-auto rounded"
            style={{ width: "min(100%, 380px)", display: ready && activeSlide === i ? "block" : "none" }}
          />
        ))}
        {!ready && (
          <div style={{ width: "min(100%, 380px)" }}>
            <p className="text-xs text-white/40 mt-2 text-center">
              L&apos;aperçu apparaît ici après génération.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
