"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  downloadCanvasPng,
} from "@/lib/socialCanvas";

type Competition = "season" | "playoffs";
type StatKey = "ppg" | "rpg" | "apg" | "spg" | "bpg" | "pir";
type League = { slug: string; name: string };

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

export default function TopLeadersGenerator() {
  const [competition, setCompetition] = useState<Competition>("season");
  const [statKey, setStatKey] = useState<StatKey>("ppg");
  const [topN, setTopN] = useState(10);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueSlug, setLeagueSlug] = useState("suble");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadLeagues() {
      const { data } = await supabase.from("leagues").select("slug, name").order("name");
      if (data && data.length > 0) {
        setLeagues(data);
        setLeagueSlug((current) => (data.some((l) => l.slug === current) ? current : data[0].slug));
      }
    }
    loadLeagues();
  }, [supabase]);

  const availableStats: StatKey[] =
    competition === "season"
      ? ["ppg", "rpg", "apg", "spg", "bpg", "pir"]
      : ["ppg", "rpg", "apg", "spg", "bpg"];

  async function generate() {
    setError(null);
    setLoading(true);
    setReady(false);

    const table = competition === "season" ? "global_rankings" : "playoff_player_totals";
    const query = supabase
      .from(table)
      .select("*")
      .eq("league_slug", leagueSlug)
      .order(statKey, { ascending: false, nullsFirst: false })
      .limit(topN);

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError("Erreur de chargement : " + fetchError.message);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setError(
        `Aucune donnée pour ${leagueSlug.toUpperCase()} en ${
          competition === "season" ? "saison régulière" : "playoffs"
        }. Essaie une autre combinaison ligue/compétition.`
      );
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

    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT);

    const competitionLabel = competition === "season" ? "SAISON RÉGULIÈRE" : "PLAYOFFS";

    paintCompactHeader(
      ctx,
      `CLASSEMENT ${competitionLabel}`,
      `${leagueSlug.toUpperCase()} · ${competitionLabel}`,
      WIDTH
    );

    // Titre
    ctx.fillStyle = COLORS.orange;
    ctx.font = "900 82px Anton, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`TOP ${topN}`, PADDING, 150);

    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 30px Anton, sans-serif";
    ctx.fillText(STAT_LABELS[statKey].title, PADDING, 184);

    // Ligne de séparation
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, 208);
    ctx.lineTo(WIDTH - PADDING, 208);
    ctx.stroke();

    // Liste
    const listTop = 232;
    const listBottom = HEIGHT - 90;
    const availableHeight = listBottom - listTop;
    const rowHeight = Math.max(38, Math.min(64, availableHeight / rows.length));

    const rankFont = Math.max(18, Math.min(28, rowHeight * 0.36));
    const nameFont = Math.max(16, Math.min(22, rowHeight * 0.28));
    const teamFont = Math.max(11, Math.min(14, rowHeight * 0.16));
    const valueFont = Math.max(18, Math.min(26, rowHeight * 0.32));

    rows.forEach((r, i) => {
      const y = listTop + i * rowHeight;

      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(PADDING - 14, y, WIDTH - (PADDING - 14) * 2, rowHeight - 4);
      }

      const centerY = y + rowHeight / 2;

      // Rang
      ctx.fillStyle = i < 3 ? COLORS.gold : "rgba(255,255,255,0.4)";
      ctx.font = `900 ${rankFont}px Anton, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), PADDING, centerY);

      const nameX = PADDING + 46;
      const hasTeamLine = rowHeight > 44;

      // Nom + équipe
      ctx.fillStyle = COLORS.white;
      ctx.font = `700 ${nameFont}px Montserrat, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(r.player_name ?? "—", nameX, centerY - (hasTeamLine ? 9 : 0));

      if (hasTeamLine) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = `600 ${teamFont}px Montserrat, sans-serif`;
        ctx.fillText((r.team_name ?? "").toUpperCase(), nameX, centerY + 12);
      }

      // Valeur stat
      const raw = r[statKey === "pir" ? "pir" : statKey];
      const val = raw != null ? Number(raw).toFixed(1) : "-";
      ctx.fillStyle = COLORS.orange;
      ctx.font = `900 ${valueFont}px Anton, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(val, WIDTH - PADDING - 44, centerY + 6);

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `700 11px Montserrat, sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(STAT_LABELS[statKey].suffix, WIDTH - PADDING - 36, centerY + 6);
    });

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    downloadCanvasPng(canvas, `bsh-${leagueSlug}-top${topN}-${statKey}-${competition}.png`);
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
          <label className="block text-sm text-white/60 mb-1">Ligue</label>
          <select
            value={leagueSlug}
            onChange={(e) => setLeagueSlug(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {leagues.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

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
            <option value="season">Saison régulière</option>
            <option value="playoffs">Playoffs</option>
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
