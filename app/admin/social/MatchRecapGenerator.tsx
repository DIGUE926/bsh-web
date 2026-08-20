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

type League = { slug: string; name: string; id: string };
type Game = {
  id: string;
  game_date: string;
  phase: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { id: string; name: string } | null;
  away_team: { id: string; name: string } | null;
};
type TopPerformer = {
  player_name: string;
  pts: number;
  reb: number;
  ast: number;
};

export default function MatchRecapGenerator() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [aiStoryline, setAiStoryline] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    async function loadGames() {
      const { data } = await supabase
        .from("games")
        .select(
          "id, game_date, phase, home_score, away_score, home_team:home_team_id(id, name), away_team:away_team_id(id, name)"
        )
        .eq("league_id", leagueId)
        .eq("status", "completed")
        .order("game_date", { ascending: false })
        .limit(30);
      const rows = (data ?? []) as unknown as Game[];
      setGames(rows);
      setGameId(rows[0]?.id ?? "");
    }
    loadGames();
  }, [leagueId, supabase]);

  // Le texte IA généré pour un match ne doit jamais se retrouver appliqué
  // à un autre match sélectionné ensuite.
  function selectGame(id: string) {
    setGameId(id);
    setAiStoryline("");
    setAiError(null);
  }

  async function generateAiCopy() {
    const game = games.find((g) => g.id === gameId);
    const league = leagues.find((l) => l.id === leagueId);
    if (!game || !game.home_team || !game.away_team) {
      setAiError("Sélectionne un match terminé.");
      return;
    }

    setAiError(null);
    setAiLoading(true);

    try {
      const [homeTop, awayTop] = await Promise.all([
        topPerformerForTeam(game.id, game.home_team.id),
        topPerformerForTeam(game.id, game.away_team.id),
      ]);

      const res = await fetch("/api/social-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "matchRecap",
          leagueName: league?.name ?? "",
          phase: game.phase,
          homeTeam: game.home_team.name,
          awayTeam: game.away_team.name,
          homeScore: game.home_score,
          awayScore: game.away_score,
          homeTop,
          awayTop,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Échec de la génération.");
        return;
      }
      setAiStoryline(data.storyline ?? "");
    } catch {
      setAiError("Impossible de contacter le service de génération.");
    } finally {
      setAiLoading(false);
    }
  }

  async function generate() {
    setError(null);
    setLoading(true);
    setReady(false);

    const game = games.find((g) => g.id === gameId);
    if (!game || !game.home_team || !game.away_team) {
      setError("Sélectionne un match terminé.");
      setLoading(false);
      return;
    }

    const [homeTop, awayTop] = await Promise.all([
      topPerformerForTeam(game.id, game.home_team.id),
      topPerformerForTeam(game.id, game.away_team.id),
    ]);

    await draw(game, homeTop, awayTop);
    setLoading(false);
    setReady(true);
  }

  async function topPerformerForTeam(
    gameId: string,
    teamId: string
  ): Promise<TopPerformer | null> {
    const { data } = await supabase
      .from("player_game_stats")
      .select("pts, reb, ast, player:player_id(name, team_id)")
      .eq("game_id", gameId)
      .order("pts", { ascending: false, nullsFirst: false })
      .limit(20);

    const rows = (data ?? []) as unknown as {
      pts: number | null;
      reb: number | null;
      ast: number | null;
      player: { name: string; team_id: string } | null;
    }[];

    const best = rows.find((r) => r.player?.team_id === teamId);
    if (!best || !best.player) return null;

    return {
      player_name: best.player.name,
      pts: best.pts ?? 0,
      reb: best.reb ?? 0,
      ast: best.ast ?? 0,
    };
  }

  async function draw(game: Game, homeTop: TopPerformer | null, awayTop: TopPerformer | null) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT);

    const league = leagues.find((l) => l.id === leagueId);
    const dateLabel = new Date(game.game_date + "T12:00:00").toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });

    paintCompactHeader(
      ctx,
      "RÉCAP DE MATCH",
      `${(league?.slug ?? "").toUpperCase()} · ${game.phase ?? "SAISON RÉGULIÈRE"}`,
      WIDTH
    );

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 18px Montserrat, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(dateLabel.toUpperCase(), PADDING, 90);

    // Accroche éditoriale (générée par IA, ou fallback silencieux si vide)
    if (aiStoryline.trim()) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = "900 22px Anton, sans-serif";
      ctx.fillText("│", PADDING, 150);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "500 26px Montserrat, sans-serif";
      const storyLines = wrapLines(ctx, aiStoryline.trim(), WIDTH - PADDING * 2 - 24);
      let sy = 150;
      storyLines.slice(0, 3).forEach((line) => {
        ctx.fillText(line, PADDING + 20, sy);
        sy += 34;
      });
    }

    const homeWon = (game.home_score ?? 0) >= (game.away_score ?? 0);

    // Bloc score
    const scoreY = 460;
    ctx.textAlign = "center";

    drawTeamName(ctx, game.home_team!.name, WIDTH * 0.27, scoreY - 64, homeWon);
    drawTeamName(ctx, game.away_team!.name, WIDTH * 0.73, scoreY - 64, !homeWon);

    ctx.font = "900 118px Anton, sans-serif";
    ctx.fillStyle = homeWon ? COLORS.gold : "rgba(255,255,255,0.85)";
    ctx.fillText(String(game.home_score ?? "-"), WIDTH * 0.27, scoreY + 30);

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "900 60px Anton, sans-serif";
    ctx.fillText("-", WIDTH / 2, scoreY + 8);

    ctx.font = "900 118px Anton, sans-serif";
    ctx.fillStyle = !homeWon ? COLORS.gold : "rgba(255,255,255,0.85)";
    ctx.fillText(String(game.away_score ?? "-"), WIDTH * 0.73, scoreY + 30);

    // Ligne de séparation
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, scoreY + 74);
    ctx.lineTo(WIDTH - PADDING, scoreY + 74);
    ctx.stroke();

    // Top performers
    const perfY = scoreY + 130;
    ctx.fillStyle = COLORS.orange;
    ctx.font = "900 24px Anton, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TOP PERFORMERS", WIDTH / 2, perfY);

    drawPerformerCard(ctx, homeTop, WIDTH * 0.27, perfY + 56);
    drawPerformerCard(ctx, awayTop, WIDTH * 0.73, perfY + 56);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  function drawTeamName(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    isWinner: boolean
  ) {
    ctx.fillStyle = isWinner ? COLORS.white : "rgba(255,255,255,0.45)";
    ctx.font = "800 20px Montserrat, sans-serif";
    ctx.textAlign = "center";

    // Coupe le nom sur 2 lignes si trop long
    const words = name.split(" ");
    if (words.length > 1 && name.length > 14) {
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(" "), x, y);
      ctx.fillText(words.slice(mid).join(" "), x, y + 24);
    } else {
      ctx.fillText(name, x, y);
    }
  }

  function drawPerformerCard(
    ctx: CanvasRenderingContext2D,
    perf: TopPerformer | null,
    x: number,
    y: number
  ) {
    if (!perf) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "600 16px Montserrat, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("—", x, y + 16);
      return;
    }

    ctx.fillStyle = COLORS.white;
    ctx.font = "800 20px Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(perf.player_name, x, y);

    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 34px Anton, sans-serif";
    ctx.fillText(`${perf.pts} PTS`, x, y + 42);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 16px Montserrat, sans-serif";
    ctx.fillText(`${perf.reb} REB · ${perf.ast} AST`, x, y + 66);
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
    const game = games.find((g) => g.id === gameId);
    downloadCanvasPng(
      canvas,
      `bsh-recap-${game?.home_team?.name ?? "match"}-vs-${game?.away_team?.name ?? ""}.png`.replace(/\s+/g, "-")
    );
  }

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        RÉCAP DE MATCH
      </h1>
      <p className="text-sm text-white/50 mb-6">
        Génère un récap façon ESPN pour un match terminé : score, vainqueur, top performer de chaque équipe.
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

        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm text-white/60 mb-1">Match</label>
          <select
            value={gameId}
            onChange={(e) => selectGame(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.game_date} · {g.home_team?.name} {g.home_score}-{g.away_score} {g.away_team?.name}
              </option>
            ))}
          </select>
          {games.length === 0 && (
            <p className="text-xs text-white/40 mt-1">Aucun match terminé pour cette ligue.</p>
          )}
        </div>
      </div>

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 mb-6 max-w-2xl">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <p className="text-sm font-semibold text-white/80">
            Accroche éditoriale — générée par IA
          </p>
          <button
            onClick={generateAiCopy}
            disabled={aiLoading || !gameId}
            className="bg-bsh-gold text-black text-xs font-bold rounded-lg px-3.5 py-2 hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {aiLoading ? "Génération..." : aiStoryline ? "Régénérer le texte" : "Générer le texte (IA)"}
          </button>
        </div>
        {aiError && <p className="text-red-400 text-xs mb-2">{aiError}</p>}
        <textarea
          value={aiStoryline}
          onChange={(e) => setAiStoryline(e.target.value)}
          placeholder="Laisse vide pour ne rien afficher au-dessus du score."
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none resize-none"
        />
        <p className="text-[11px] text-white/30 mt-2">
          Relis et corrige si besoin, puis clique « Générer l&apos;image » pour appliquer ce texte.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={generate}
          disabled={loading || !gameId}
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
