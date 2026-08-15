"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Competition = "season" | "playoffs";
type StatKey = "ppg" | "rpg" | "apg" | "spg" | "bpg" | "pir";

type LeaderRow = {
  player_name: string | null;
  team_name: string | null;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  spg: number | null;
  bpg: number | null;
  pir?: number | null;
};

const STAT_LABELS: Record<StatKey, { title: string; suffix: string }> = {
  ppg: { title: "MEILLEURS SCOREURS", suffix: "PTS" },
  rpg: { title: "MEILLEURS REBONDEURS", suffix: "REB" },
  apg: { title: "MEILLEURS PASSEURS", suffix: "AST" },
  spg: { title: "MEILLEURS INTERCEPTEURS", suffix: "STL" },
  bpg: { title: "MEILLEURS CONTREURS", suffix: "BLK" },
  pir: { title: "CLASSEMENT IMPACT", suffix: "PIR" },
};

const WIDTH = 1080;
const HEIGHT = 1350;

export default function TopLeadersGenerator() {
  const [competition, setCompetition] = useState<Competition>("playoffs");
  const [statKey, setStatKey] = useState<StatKey>("ppg");
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const supabase = createClient();

  const availableStats: StatKey[] =
    competition === "season"
      ? ["ppg", "rpg", "apg", "spg", "bpg", "pir"]
      : ["ppg", "rpg", "apg", "spg", "bpg"];

  async function generate() {
    setError(null);
    setLoading(true);
    setReady(false);

    const table = competition === "season" ? "global_rankings" : "playoff_player_totals";
    let query = supabase
      .from(table)
      .select("*")
      .order(statKey, { ascending: false, nullsFirst: false })
      .limit(topN);

    if (competition === "season") {
      query = query.eq("league_slug", "suble");
    }

    const { data, error: fetchError } = await query;

    if (fetchError || !data) {
      setError("Erreur de chargement : " + (fetchError?.message ?? "inconnue"));
      setLoading(false);
      return;
    }

    await draw(data as LeaderRow[]);
    setLoading(false);
    setReady(true);
  }

  async function draw(rows: LeaderRow[]) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // S'assure que la police Anton (déjà chargée sur le site) est prête pour le canvas
    try {
      await document.fonts.load("900 80px Anton");
      await document.fonts.ready;
    } catch {
      // fallback silencieux sur une police système si Anton ne charge pas
    }

    const orange = "#FF6B00";
    const gold = "#FFD60A";
    const black = "#0D0D0D";

    // Fond
    ctx.fillStyle = black;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Glow décoratif
    const glow1 = ctx.createRadialGradient(150, 200, 0, 150, 200, 500);
    glow1.addColorStop(0, "rgba(255,107,0,0.16)");
    glow1.addColorStop(1, "rgba(255,107,0,0)");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow2 = ctx.createRadialGradient(WIDTH - 150, HEIGHT - 250, 0, WIDTH - 150, HEIGHT - 250, 500);
    glow2.addColorStop(0, "rgba(255,214,10,0.10)");
    glow2.addColorStop(1, "rgba(255,214,10,0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Tentative de fond décoratif du terrain (silencieux si absent)
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.drawImage(img, WIDTH / 2 - 700, HEIGHT / 2 - 700, 1400, 1400);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = "/court-pattern.svg";
    });

    const PADDING = 64;

    // Wordmark
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = orange;
    ctx.font = "700 30px Montserrat, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("BALLSOHARD", PADDING, 90);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 26px Montserrat, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      competition === "season" ? "SUBLE · SAISON RÉGULIÈRE" : "SUBLE · PLAYOFFS",
      WIDTH - PADDING,
      90
    );

    // Titre
    ctx.fillStyle = orange;
    ctx.font = "900 108px Anton, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`TOP ${topN}`, PADDING, 220);

    ctx.fillStyle = gold;
    ctx.font = "900 42px Anton, sans-serif";
    ctx.fillText(STAT_LABELS[statKey].title, PADDING, 268);

    // Ligne de séparation
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PADDING, 300);
    ctx.lineTo(WIDTH - PADDING, 300);
    ctx.stroke();

    // Liste
    const listTop = 330;
    const listBottom = HEIGHT - 110;
    const availableHeight = listBottom - listTop;
    const rowHeight = Math.max(46, Math.min(102, availableHeight / rows.length));

    const rankFont = Math.max(24, Math.min(52, rowHeight * 0.5));
    const nameFont = Math.max(20, Math.min(34, rowHeight * 0.32));
    const teamFont = Math.max(14, Math.min(22, rowHeight * 0.2));
    const valueFont = Math.max(22, Math.min(40, rowHeight * 0.38));

    rows.forEach((r, i) => {
      const y = listTop + i * rowHeight;

      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.035)";
        ctx.fillRect(PADDING - 16, y, WIDTH - (PADDING - 16) * 2, rowHeight - 6);
      }

      const centerY = y + rowHeight / 2;

      // Rang
      ctx.fillStyle = i < 3 ? gold : "rgba(255,255,255,0.45)";
      ctx.font = `900 ${rankFont}px Anton, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), PADDING, centerY);

      const nameX = PADDING + 76;

      // Nom + équipe
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${nameFont}px Montserrat, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(r.player_name ?? "—", nameX, centerY - (rowHeight > 60 ? 12 : 0));

      if (rowHeight > 60) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = `500 ${teamFont}px Montserrat, sans-serif`;
        ctx.fillText(r.team_name ?? "", nameX, centerY + 16);
      }

      // Valeur stat
      const raw = r[statKey === "pir" ? "pir" : statKey];
      const val = raw != null ? Number(raw).toFixed(1) : "-";
      ctx.fillStyle = orange;
      ctx.font = `900 ${valueFont}px Anton, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(val, WIDTH - PADDING - 90, centerY);

      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `600 16px Montserrat, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(STAT_LABELS[statKey].suffix, WIDTH - PADDING, centerY);
    });

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "600 20px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("BallsoHard — La donnée du basket haïtien", WIDTH / 2, HEIGHT - 40);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `bsh-top${topN}-${statKey}-${competition}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        TOP LEADERS — RÉSEAUX SOCIAUX
      </h1>
      <p className="text-sm text-white/50 mb-6">
        Génère une image prête à poster sur Instagram à partir des classements en direct.
      </p>

      <div className="flex flex-wrap gap-4 mb-6 max-w-2xl">
        <div>
          <label className="block text-sm text-white/60 mb-1">Compétition</label>
          <select
            value={competition}
            onChange={(e) => {
              const val = e.target.value as Competition;
              setCompetition(val);
              const stats: StatKey[] =
                val === "season" ? ["ppg", "rpg", "apg", "spg", "bpg", "pir"] : ["ppg", "rpg", "apg", "spg", "bpg"];
              if (!stats.includes(statKey)) setStatKey("ppg");
            }}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            <option value="playoffs">Playoffs</option>
            <option value="season">Saison régulière</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Catégorie</label>
          <select
            value={statKey}
            onChange={(e) => setStatKey(e.target.value as StatKey)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {availableStats.map((s) => (
              <option key={s} value={s}>
                {STAT_LABELS[s].title} ({s.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Top</label>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {[5, 10, 15, 20, 25].map((n) => (
              <option key={n} value={n}>
                Top {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={generate}
          disabled={loading}
          className="bg-bsh-orange text-black font-bold rounded-lg px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Génération..." : "Générer l'image"}
        </button>
        {ready && (
          <button
            onClick={download}
            className="bg-white/10 text-white font-bold rounded-lg px-5 py-2.5 hover:bg-white/20 transition-colors"
          >
            Télécharger le PNG
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 inline-block">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="max-w-full h-auto rounded"
          style={{ width: "min(100%, 380px)" }}
        />
        {!ready && (
          <p className="text-xs text-white/40 mt-2 text-center">
            L&apos;aperçu apparaît ici après génération.
          </p>
        )}
      </div>
    </div>
  );
}
