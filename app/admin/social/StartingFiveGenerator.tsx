"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CANVAS_WIDTH as WIDTH,
  CANVAS_HEIGHT as HEIGHT,
  PADDING,
  COLORS,
  loadBrandFonts,
  paintBackground,
  paintCourtPattern,
  paintPhotoBackground,
  paintCompactHeader,
  paintFooter,
  downloadCanvasPng,
} from "@/lib/socialCanvas";

type Competition = "season" | "playoffs";
type League = { id: string; slug: string; name: string };
type Team = { id: string; name: string; photo_url: string | null };
type PlayerRow = {
  player_id: string;
  player_name: string;
  position: string | null;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  pir: number | null;
};

const MAX_STARTERS = 5;

export default function StartingFiveGenerator() {
  const [competition, setCompetition] = useState<Competition>("season");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [roster, setRoster] = useState<PlayerRow[]>([]);
  const [starterIds, setStarterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
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
    async function loadTeams() {
      const { data } = await supabase
        .from("teams")
        .select("id, name, photo_url")
        .eq("league_id", leagueId)
        .order("name");
      const rows = (data ?? []) as Team[];
      setTeams(rows);
      setTeamId(rows[0]?.id ?? "");
    }
    loadTeams();
  }, [leagueId, supabase]);

  useEffect(() => {
    if (!teamId) return;
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    async function loadRoster() {
      const table = competition === "season" ? "global_rankings" : "playoff_player_totals";
      const { data } = await supabase
        .from(table)
        .select("player_id, player_name, position, ppg, rpg, apg, pir")
        .eq("team_name", team!.name)
        .order("player_name");
      setRoster((data ?? []) as PlayerRow[]);
      setStarterIds([]);
      setReady(false);
    }
    loadRoster();
  }, [teamId, competition, teams, supabase]);

  function selectTeam(id: string) {
    setTeamId(id);
    setReady(false);
  }

  function toggleStarter(playerId: string) {
    setStarterIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= MAX_STARTERS) return prev;
      return [...prev, playerId];
    });
    setReady(false);
  }

  async function generate() {
    setError(null);
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      setError("Sélectionne une équipe.");
      return;
    }
    if (starterIds.length !== MAX_STARTERS) {
      setError(`Choisis exactement ${MAX_STARTERS} joueurs.`);
      return;
    }

    setLoading(true);
    const league = leagues.find((l) => l.id === leagueId);
    const contextLabel = `${(league?.slug ?? "").toUpperCase()} · ${
      competition === "season" ? "SAISON RÉGULIÈRE" : "PLAYOFFS"
    }`;
    const starters = starterIds
      .map((id) => roster.find((p) => p.player_id === id))
      .filter((p): p is PlayerRow => !!p);

    await drawStartingFive(team, starters, contextLabel);
    setLoading(false);
    setReady(true);
  }

  async function drawStartingFive(team: Team, starters: PlayerRow[], contextLabel: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    if (team.photo_url) {
      await paintPhotoBackground(ctx, team.photo_url, WIDTH, HEIGHT, 0.72);
    } else {
      await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    }
    paintCompactHeader(ctx, "CINQ DE DÉPART", contextLabel, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    const centerX = WIDTH / 2;

    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 20px Montserrat, sans-serif";
    ctx.fillText("STARTING FIVE", centerX, 140);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 46px Anton, sans-serif";
    const nameLines = wrapLines(ctx, team.name.toUpperCase(), WIDTH - PADDING * 2 - 60);
    let ny = 195;
    nameLines.forEach((line) => {
      ctx.fillText(line, centerX, ny);
      ny += 48;
    });

    const rows = 5;
    const startY = ny + 40;
    const gap = 16;
    const rowH = (HEIGHT - startY - 180 - gap * (rows - 1)) / rows;

    starters.forEach((p, i) => {
      const y = startY + i * (rowH + gap);

      ctx.fillStyle = "rgba(255,255,255,0.045)";
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      roundRect(ctx, PADDING, y, WIDTH - PADDING * 2, rowH, 16);
      ctx.fill();
      ctx.stroke();

      // Badge numéroté à gauche
      const badgeCx = PADDING + 48;
      const badgeCy = y + rowH / 2;
      ctx.beginPath();
      ctx.arc(badgeCx, badgeCy, 30, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,107,0,0.12)";
      ctx.fill();
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = COLORS.orange;
      ctx.font = "900 26px Anton, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), badgeCx, badgeCy + 2);
      ctx.textBaseline = "alphabetic";

      // Nom + poste
      const textX = PADDING + 96;
      ctx.textAlign = "left";
      ctx.fillStyle = COLORS.white;
      ctx.font = "800 26px Montserrat, sans-serif";
      ctx.fillText(p.player_name, textX, y + rowH / 2 - 6);

      if (p.position) {
        ctx.fillStyle = COLORS.gold;
        ctx.font = "700 14px Montserrat, sans-serif";
        ctx.fillText(p.position, textX, y + rowH / 2 + 20);
      }

      // Stats à droite : PTS / REB / AST
      const statBlocks: { label: string; value: string }[] = [
        { label: "PTS", value: p.ppg != null ? p.ppg.toFixed(1) : "-" },
        { label: "REB", value: p.rpg != null ? p.rpg.toFixed(1) : "-" },
        { label: "AST", value: p.apg != null ? p.apg.toFixed(1) : "-" },
      ];
      const statW = 88;
      const statsRightX = WIDTH - PADDING - 24;
      statBlocks.forEach((s, si) => {
        const sx = statsRightX - (statBlocks.length - 1 - si) * statW;
        ctx.textAlign = "center";
        ctx.fillStyle = COLORS.white;
        ctx.font = "800 24px Montserrat, sans-serif";
        ctx.fillText(s.value, sx, y + rowH / 2 - 4);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "700 11px Montserrat, sans-serif";
        ctx.fillText(s.label, sx, y + rowH / 2 + 16);
      });
    });

    paintFooter(ctx, WIDTH, HEIGHT);
  }

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

  function downloadImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const team = teams.find((t) => t.id === teamId);
    const name = (team?.name ?? "equipe").replace(/\s+/g, "-");
    downloadCanvasPng(canvas, `bsh-${name}-cinq-de-depart.png`);
  }

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        CINQ DE DÉPART
      </h1>
      <p className="text-sm text-white/50 mb-6 max-w-xl">
        Choisis manuellement les 5 titulaires d&apos;une équipe, une seule image générée avec leurs
        stats.
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
          <label className="block text-sm text-white/60 mb-1">Équipe</label>
          <select
            value={teamId}
            onChange={(e) => selectTeam(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 mb-6 max-w-2xl">
        <p className="text-sm font-semibold text-white/80 mb-2">
          Titulaires ({starterIds.length}/{MAX_STARTERS})
        </p>
        {roster.length === 0 && (
          <p className="text-xs text-white/30">Aucun joueur avec des stats pour cette équipe.</p>
        )}
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {roster.map((p) => {
            const selected = starterIds.includes(p.player_id);
            return (
              <button
                key={p.player_id}
                type="button"
                onClick={() => toggleStarter(p.player_id)}
                disabled={!selected && starterIds.length >= MAX_STARTERS}
                className={`w-full flex items-center justify-between gap-2 text-left text-sm rounded px-3 py-2 border transition-colors disabled:opacity-30 ${
                  selected
                    ? "border-bsh-orange bg-bsh-orange/10 text-bsh-orange font-semibold"
                    : "border-white/10 text-white/70 hover:border-white/25"
                }`}
              >
                <span>
                  {p.player_name}
                  {p.position ? ` · ${p.position}` : ""}
                </span>
                <span className="text-xs text-white/40">
                  {p.ppg != null ? `${p.ppg.toFixed(1)} PTS` : "-"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={generate}
          disabled={loading || starterIds.length !== MAX_STARTERS}
          className="bg-bsh-orange text-black font-bold rounded-lg px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Génération..." : "Générer l'image"}
        </button>
        {ready && (
          <button
            onClick={downloadImage}
            className="bg-white/10 text-white font-bold rounded-lg px-5 py-2.5 hover:bg-white/20 transition-colors"
          >
            Télécharger
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
          style={{ width: "min(100%, 380px)", display: ready ? "block" : "none" }}
        />
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
