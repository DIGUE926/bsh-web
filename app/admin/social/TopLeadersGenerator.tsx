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
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastRows, setLastRows] = useState<LeaderRow[]>([]);
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

  // Le texte IA généré pour un classement ne doit jamais se retrouver
  // appliqué à une autre combinaison ligue/catégorie sélectionnée ensuite.
  function resetAiText() {
    setAiInsight("");
    setAiError(null);
  }

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

    const rows = data as LeaderRow[];
    setLastRows(rows);
    await draw(rows);
    setLoading(false);
    setReady(true);
  }

  async function generateAiCopy() {
    if (!lastRows.length) {
      setAiError("Génère d'abord l'image pour charger le classement.");
      return;
    }

    setAiError(null);
    setAiLoading(true);

    try {
      const league = leagues.find((l) => l.slug === leagueSlug);
      const res = await fetch("/api/social-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "topLeaders",
          leagueName: league?.name ?? leagueSlug,
          competitionLabel: competition === "season" ? "Saison régulière" : "Playoffs",
          statLabel: STAT_LABELS[statKey].title,
          topN,
          leaders: lastRows.map((r) => ({
            name: r.player_name,
            team: r.team_name,
            value: r[statKey === "pir" ? "pir" : statKey] ?? null,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Échec de la génération.");
        return;
      }
      setAiInsight(data.insight ?? "");
    } catch {
      setAiError("Impossible de contacter le service de génération.");
    } finally {
      setAiLoading(false);
    }
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

    // Insight éditorial (généré par IA, ou rien si vide) — pousse le reste vers le bas.
    let dividerY = 208;
    if (aiInsight.trim()) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "500 22px Montserrat, sans-serif";
      ctx.textAlign = "left";
      const insightLines = wrapLines(ctx, aiInsight.trim(), WIDTH - PADDING * 2).slice(0, 2);
      let iy = 218;
      insightLines.forEach((line) => {
        ctx.fillText(line, PADDING, iy);
        iy += 28;
      });
      dividerY = iy + 8;
    }

    // Ligne de séparation
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, dividerY);
    ctx.lineTo(WIDTH - PADDING, dividerY);
    ctx.stroke();

    // Liste
    const listTop = dividerY + 24;
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
            onChange={(e) => {
              setLeagueSlug(e.target.value);
              resetAiText();
            }}
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
              resetAiText();
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
            onChange={(e) => {
              setStatKey(e.target.value as StatKey);
              resetAiText();
            }}
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
            onChange={(e) => {
              setTopN(Number(e.target.value));
              resetAiText();
            }}
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

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 mb-6 max-w-2xl">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <p className="text-sm font-semibold text-white/80">
            Insight éditorial — généré par IA
          </p>
          <button
            onClick={generateAiCopy}
            disabled={aiLoading || !lastRows.length}
            className="bg-bsh-gold text-black text-xs font-bold rounded-lg px-3.5 py-2 hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {aiLoading ? "Génération..." : aiInsight ? "Régénérer le texte" : "Générer le texte (IA)"}
          </button>
        </div>
        {aiError && <p className="text-red-400 text-xs mb-2">{aiError}</p>}
        <textarea
          value={aiInsight}
          onChange={(e) => setAiInsight(e.target.value)}
          placeholder="Génère d'abord l'image une fois, puis clique pour écrire un insight. Laisse vide pour ne rien afficher."
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none resize-none"
        />
        <p className="text-[11px] text-white/30 mt-2">
          Relis et corrige si besoin, puis régénère l&apos;image pour appliquer ce texte.
        </p>
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
