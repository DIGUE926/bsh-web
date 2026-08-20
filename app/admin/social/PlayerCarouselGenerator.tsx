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
  paintWordmarkHeader,
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

const STAT_GRID: { key: keyof PlayerRow; label: string; suffix: string; format?: (v: number) => string }[] = [
  { key: "ppg", label: "POINTS", suffix: "/MATCH" },
  { key: "rpg", label: "REBONDS", suffix: "/MATCH" },
  { key: "apg", label: "PASSES", suffix: "/MATCH" },
  { key: "spg", label: "INTERCEPTIONS", suffix: "/MATCH" },
  { key: "bpg", label: "CONTRES", suffix: "/MATCH" },
  { key: "pir", label: "IMPACT (PIR)", suffix: "" },
];

const SLIDE_COUNT = 3;

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
      drawOutroSlide(player, contextLabel),
    ]);

    setLoading(false);
    setReady(true);
    setActiveSlide(0);
  }

  function initials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
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
    paintWordmarkHeader(ctx, contextLabel, WIDTH);
    paintSlideIndicator(ctx, 0, SLIDE_COUNT, WIDTH);

    // Monogramme
    const cx = WIDTH / 2;
    const cy = 480;
    const radius = 170;
    const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    grad.addColorStop(0, "rgba(255,107,0,0.25)");
    grad.addColorStop(1, "rgba(255,214,10,0.12)");
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,214,10,0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 130px Anton, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(player.player_name), cx, cy + 10);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 26px Montserrat, sans-serif";
    ctx.fillText((player.team_name ?? "").toUpperCase(), cx, cy + radius + 70);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 76px Anton, sans-serif";
    wrapCenteredText(ctx, player.player_name.toUpperCase(), cx, cy + radius + 130, WIDTH - PADDING * 2, 78);

    // Stat phare (PIR)
    const badgeY = HEIGHT - 260;
    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 200px Anton, sans-serif";
    ctx.fillText(player.pir != null ? Number(player.pir).toFixed(1) : "-", cx, badgeY);

    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 32px Montserrat, sans-serif";
    ctx.fillText("RATING D'IMPACT (PIR)", cx, badgeY + 50);

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
    paintWordmarkHeader(ctx, contextLabel, WIDTH);
    paintSlideIndicator(ctx, 1, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 34px Anton, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("PROFIL STATISTIQUE", PADDING, 175);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 56px Anton, sans-serif";
    ctx.fillText(player.player_name.toUpperCase(), PADDING, 230);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PADDING, 260);
    ctx.lineTo(WIDTH - PADDING, 260);
    ctx.stroke();

    // Grille de stats 2 colonnes
    const cols = 2;
    const gap = 24;
    const cardW = (WIDTH - PADDING * 2 - gap) / cols;
    const cardH = 190;
    const startY = 310;

    STAT_GRID.forEach((stat, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = PADDING + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, cardW, cardH, 16);
      ctx.fill();
      ctx.stroke();

      const raw = player[stat.key];
      const val = raw != null ? Number(raw).toFixed(1) : "-";

      ctx.fillStyle = COLORS.orange;
      ctx.font = "900 68px Anton, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(val, x + 28, y + 100);

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "700 20px Montserrat, sans-serif";
      ctx.fillText(stat.label, x + 28, y + 140);
    });

    const gpY = startY + Math.ceil(STAT_GRID.length / cols) * (cardH + gap) + 30;
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 22px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `${player.games_played ?? "-"} match${(player.games_played ?? 0) > 1 ? "s" : ""} joué${(player.games_played ?? 0) > 1 ? "s" : ""}`,
      WIDTH / 2,
      gpY
    );

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawOutroSlide(player: PlayerRow, contextLabel: string) {
    const canvas = canvasRefs[2].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintWordmarkHeader(ctx, contextLabel, WIDTH);
    paintSlideIndicator(ctx, 2, SLIDE_COUNT, WIDTH);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 40px Anton, sans-serif";
    ctx.fillText("À SUIVRE", WIDTH / 2, HEIGHT / 2 - 220);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 90px Anton, sans-serif";
    wrapCenteredText(ctx, player.player_name.toUpperCase(), WIDTH / 2, HEIGHT / 2 - 120, WIDTH - PADDING * 2, 96);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 26px Montserrat, sans-serif";
    ctx.fillText((player.team_name ?? "").toUpperCase(), WIDTH / 2, HEIGHT / 2 - 20);

    ctx.strokeStyle = "rgba(255,214,10,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 - 80, HEIGHT / 2 + 30);
    ctx.lineTo(WIDTH / 2 + 80, HEIGHT / 2 + 30);
    ctx.stroke();

    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 30px Montserrat, sans-serif";
    ctx.fillText("PLUS D'ANALYSES SUR", WIDTH / 2, HEIGHT / 2 + 90);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 52px Anton, sans-serif";
    ctx.fillText("@BALLSOHARDX2", WIDTH / 2, HEIGHT / 2 + 150);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  function wrapCenteredText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
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

    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
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

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        CARROUSEL JOUEUR
      </h1>
      <p className="text-sm text-white/50 mb-6">
        Génère un carrousel Instagram de 3 slides (accroche, profil stats, outro) pour mettre un joueur en avant.
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
        <div className="flex gap-2 mb-3">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                activeSlide === i ? "bg-bsh-orange text-black" : "bg-white/5 text-white/60"
              }`}
            >
              Slide {i + 1}
            </button>
          ))}
        </div>
      )}

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 inline-block">
        {[0, 1, 2].map((i) => (
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
