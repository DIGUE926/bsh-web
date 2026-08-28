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
  paintFittedPhoto,
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
  team_name: string | null;
  position: string | null;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  pir: number | null;
  photo_url: string | null;
};

const MAX_STARTERS = 5;

export default function StartingFiveGenerator() {
  const [competition, setCompetition] = useState<Competition>("season");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [roster, setRoster] = useState<PlayerRow[]>([]);
  const [rosterSearch, setRosterSearch] = useState("");
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

  // Recherche générale : tous les joueurs de la ligue, pas juste l'équipe
  // sélectionnée -- choisir un joueur remplit l'équipe automatiquement.
  useEffect(() => {
    if (!leagueId) return;
    const league = leagues.find((l) => l.id === leagueId);
    if (!league) return;
    async function loadRoster() {
      const table = competition === "season" ? "global_rankings" : "playoff_player_totals";
      const { data } = await supabase
        .from(table)
        .select("player_id, player_name, team_name, position, ppg, rpg, apg, pir")
        .eq("league_slug", league!.slug)
        .order("player_name");
      const rows = (data ?? []) as Omit<PlayerRow, "photo_url">[];

      // global_rankings/playoff_player_totals n'exposent pas photo_url --
      // requête séparée sur players plutôt que de toucher à ces vues.
      const ids = rows.map((r) => r.player_id);
      const photosById = new Map<string, string | null>();
      if (ids.length > 0) {
        const { data: photoRows } = await supabase
          .from("players")
          .select("id, photo_url")
          .in("id", ids);
        (photoRows ?? []).forEach((p) => photosById.set(p.id, p.photo_url));
      }

      setRoster(rows.map((r) => ({ ...r, photo_url: photosById.get(r.player_id) ?? null })));
      setStarterIds([]);
      setRosterSearch("");
      setReady(false);
    }
    loadRoster();
  }, [leagueId, competition, leagues, supabase]);

  function selectTeam(id: string) {
    setTeamId(id);
    setReady(false);
  }

  function toggleStarter(player: PlayerRow) {
    setStarterIds((prev) => {
      if (prev.includes(player.player_id)) return prev.filter((id) => id !== player.player_id);
      if (prev.length >= MAX_STARTERS) return prev;
      // Le premier joueur choisi fixe l'équipe (photo de fond, nom affiché).
      if (prev.length === 0 && player.team_name) {
        const match = teams.find((t) => t.name === player.team_name);
        if (match) setTeamId(match.id);
      }
      return [...prev, player.player_id];
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
    const gap = 18;
    const rowH = (HEIGHT - startY - 180 - gap * (rows - 1)) / rows;

    for (let i = 0; i < starters.length; i++) {
      const p = starters[i];
      const y = startY + i * (rowH + gap);

      // Carte avec léger dégradé + accent orange sur le bord gauche.
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      roundRect(ctx, PADDING, y, WIDTH - PADDING * 2, rowH, 18);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      roundRect(ctx, PADDING, y, WIDTH - PADDING * 2, rowH, 18);
      ctx.clip();
      ctx.fillStyle = COLORS.orange;
      ctx.fillRect(PADDING, y, 5, rowH);
      ctx.restore();

      // Portrait carré à coins arrondis à gauche, ou avatar dégradé avec
      // initiales si aucune photo n'est renseignée.
      const photoSize = rowH - 20;
      const photoX = PADDING + 20;
      const photoY = y + (rowH - photoSize) / 2;

      if (p.photo_url) {
        await paintFittedPhoto(ctx, p.photo_url, photoX, photoY, photoSize, photoSize, 14);
      } else {
        const grad = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
        grad.addColorStop(0, "rgba(255,107,0,0.35)");
        grad.addColorStop(1, "rgba(255,214,10,0.18)");
        ctx.fillStyle = grad;
        roundRect(ctx, photoX, photoY, photoSize, photoSize, 14);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "900 30px Anton, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials(p.player_name), photoX + photoSize / 2, photoY + photoSize / 2 + 2);
        ctx.textBaseline = "alphabetic";
      }

      // Badge numéroté, chevauche le coin bas-droit du portrait.
      const badgeR = 18;
      const badgeCx = photoX + photoSize - 2;
      const badgeCy = photoY + photoSize - 2;
      ctx.beginPath();
      ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.orange;
      ctx.fill();
      ctx.strokeStyle = COLORS.black;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = COLORS.black;
      ctx.font = "900 18px Anton, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), badgeCx, badgeCy + 1);
      ctx.textBaseline = "alphabetic";

      // Nom + poste
      const textX = photoX + photoSize + 24;
      ctx.textAlign = "left";
      ctx.fillStyle = COLORS.white;
      ctx.font = "800 25px Montserrat, sans-serif";
      ctx.fillText(p.player_name, textX, y + rowH / 2 - 8);

      if (p.position) {
        const pillW = ctx.measureText(p.position).width + 20;
        const pillY = y + rowH / 2 + 4;
        ctx.fillStyle = "rgba(255,214,10,0.15)";
        roundRect(ctx, textX, pillY, pillW, 24, 12);
        ctx.fill();
        ctx.fillStyle = COLORS.gold;
        ctx.font = "800 13px Montserrat, sans-serif";
        ctx.fillText(p.position, textX + 10, pillY + 17);
      }

      // Stats à droite : PTS / REB / AST / IMPACT
      const statBlocks: { label: string; value: string; accent?: boolean }[] = [
        { label: "PTS", value: p.ppg != null ? p.ppg.toFixed(1) : "-" },
        { label: "REB", value: p.rpg != null ? p.rpg.toFixed(1) : "-" },
        { label: "AST", value: p.apg != null ? p.apg.toFixed(1) : "-" },
        { label: "IMPACT", value: p.pir != null ? p.pir.toFixed(1) : "-", accent: true },
      ];
      const statW = 74;
      const statsRightX = WIDTH - PADDING - 24;
      statBlocks.forEach((s, si) => {
        const sx = statsRightX - (statBlocks.length - 1 - si) * statW;
        ctx.textAlign = "center";
        ctx.fillStyle = s.accent ? COLORS.gold : COLORS.white;
        ctx.font = "800 22px Montserrat, sans-serif";
        ctx.fillText(s.value, sx, y + rowH / 2 - 4);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "700 10px Montserrat, sans-serif";
        ctx.fillText(s.label, sx, y + rowH / 2 + 16);
      });
    }

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

  const query = rosterSearch.trim().toLowerCase();
  const visibleRoster = query
    ? roster.filter((p) => p.player_name.toLowerCase().includes(query))
    : roster;

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        CINQ DE DÉPART
      </h1>
      <p className="text-sm text-white/50 mb-6 max-w-xl">
        Cherche et choisis manuellement 5 titulaires (recherche sur toute la ligue, pas besoin de
        choisir l&apos;équipe d&apos;abord) — une seule image générée avec leurs stats.
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
          <label className="block text-sm text-white/60 mb-1">
            Équipe <span className="text-white/30">(remplie auto au 1er choix)</span>
          </label>
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
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <p className="text-sm font-semibold text-white/80">
            Titulaires ({starterIds.length}/{MAX_STARTERS})
          </p>
          <input
            value={rosterSearch}
            onChange={(e) => setRosterSearch(e.target.value)}
            placeholder="Rechercher un joueur..."
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 placeholder:text-white/30 focus:border-bsh-orange outline-none w-full sm:w-56"
          />
        </div>
        {roster.length === 0 && (
          <p className="text-xs text-white/30">Aucun joueur avec des stats pour cette équipe.</p>
        )}
        {roster.length > 0 && visibleRoster.length === 0 && (
          <p className="text-xs text-white/30">Aucun joueur ne correspond à &quot;{rosterSearch}&quot;.</p>
        )}
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {visibleRoster.map((p) => {
            const selected = starterIds.includes(p.player_id);
            return (
              <button
                key={p.player_id}
                type="button"
                onClick={() => toggleStarter(p)}
                disabled={!selected && starterIds.length >= MAX_STARTERS}
                className={`w-full flex items-center justify-between gap-2 text-left text-sm rounded px-3 py-2 border transition-colors disabled:opacity-30 ${
                  selected
                    ? "border-bsh-orange bg-bsh-orange/10 text-bsh-orange font-semibold"
                    : "border-white/10 text-white/70 hover:border-white/25"
                }`}
              >
                <span>
                  {p.player_name}
                  {p.team_name ? ` · ${p.team_name}` : ""}
                  {p.position ? ` · ${p.position}` : ""}
                </span>
                <span className="text-xs text-white/40 shrink-0">
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
