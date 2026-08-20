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
type Team = {
  id: string;
  name: string;
  head_coach: string | null;
  assistant_coach: string | null;
};
type TopPlayer = {
  player_name: string;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  pir: number | null;
};

type TeamStats = {
  wins: number;
  losses: number;
  gamesPlayed: number;
  ppg: number | null;
  oppg: number | null;
  diff: number | null;
};

const SLIDE_COUNT = 4;
const SLIDE_LABELS = ["Accroche", "Bilan", "Meilleurs joueurs", "Outro"];

export default function TeamBreakdownGenerator() {
  const [competition, setCompetition] = useState<Competition>("season");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [aiHook, setAiHook] = useState("");
  const [aiOutro, setAiOutro] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const canvasRefs = [
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
    async function loadTeams() {
      const { data } = await supabase
        .from("teams")
        .select("id, name, head_coach, assistant_coach")
        .eq("league_id", leagueId)
        .order("name");
      const rows = (data ?? []) as Team[];
      setTeams(rows);
      setTeamId(rows[0]?.id ?? "");
    }
    loadTeams();
  }, [leagueId, supabase]);

  // Le texte IA généré pour une équipe ne doit jamais se retrouver appliqué
  // à une autre équipe sélectionnée ensuite.
  function selectTeam(id: string) {
    setTeamId(id);
    setAiHook("");
    setAiOutro("");
    setAiError(null);
  }

  async function loadTeamStats(id: string): Promise<TeamStats> {
    const table = competition === "season" ? "games" : "playoff_games";
    const homeCol = competition === "season" ? "home_team_id" : "team_home_id";
    const awayCol = competition === "season" ? "away_team_id" : "team_away_id";

    const { data } = await supabase
      .from(table)
      .select(`${homeCol}, ${awayCol}, home_score, away_score, status`)
      .or(`${homeCol}.eq.${id},${awayCol}.eq.${id}`)
      .eq("status", "completed");

    const rows = (data ?? []) as unknown as {
      [key: string]: string | number | null;
      home_score: number | null;
      away_score: number | null;
    }[];

    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    let gamesPlayed = 0;

    rows.forEach((g) => {
      if (g.home_score == null || g.away_score == null) return;
      const isHome = g[homeCol] === id;
      const teamScore = isHome ? g.home_score : g.away_score;
      const oppScore = isHome ? g.away_score : g.home_score;
      pointsFor += teamScore;
      pointsAgainst += oppScore;
      gamesPlayed += 1;
      if (teamScore > oppScore) wins += 1;
      else if (oppScore > teamScore) losses += 1;
    });

    const ppg = gamesPlayed > 0 ? pointsFor / gamesPlayed : null;
    const oppg = gamesPlayed > 0 ? pointsAgainst / gamesPlayed : null;
    const diff = ppg != null && oppg != null ? ppg - oppg : null;

    return { wins, losses, gamesPlayed, ppg, oppg, diff };
  }

  async function loadTopPlayers(team: Team): Promise<TopPlayer[]> {
    const statsTable = competition === "season" ? "global_rankings" : "playoff_player_totals";
    const { data } = await supabase
      .from(statsTable)
      .select("player_name, team_name, ppg, rpg, apg, pir")
      .eq("team_name", team.name)
      .order("pir", { ascending: false, nullsFirst: false })
      .limit(3);
    return (data ?? []) as TopPlayer[];
  }

  async function generateAiCopy() {
    const team = teams.find((t) => t.id === teamId);
    const league = leagues.find((l) => l.id === leagueId);
    if (!team) {
      setAiError("Sélectionne une équipe.");
      return;
    }

    setAiError(null);
    setAiLoading(true);

    try {
      const [stats, topPlayers] = await Promise.all([loadTeamStats(team.id), loadTopPlayers(team)]);

      const res = await fetch("/api/social-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "teamBreakdown",
          teamName: team.name,
          leagueName: league?.name ?? "",
          competitionLabel: competition === "season" ? "Saison régulière" : "Playoffs",
          wins: stats.wins,
          losses: stats.losses,
          ppg: stats.ppg,
          oppg: stats.oppg,
          diff: stats.diff,
          topPerformers: topPlayers.map((p) => ({ name: p.player_name, ppg: p.ppg, pir: p.pir })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Échec de la génération.");
        return;
      }
      setAiHook(data.hook ?? "");
      setAiOutro(data.outro ?? "");
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

    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      setError("Sélectionne une équipe.");
      setLoading(false);
      return;
    }

    const league = leagues.find((l) => l.id === leagueId);
    const contextLabel = `${(league?.slug ?? "").toUpperCase()} · ${
      competition === "season" ? "SAISON RÉGULIÈRE" : "PLAYOFFS"
    }`;

    const [stats, topPlayers] = await Promise.all([loadTeamStats(team.id), loadTopPlayers(team)]);

    await Promise.all([
      drawHookSlide(team, stats, contextLabel),
      drawStatsSlide(team, stats, contextLabel),
      drawTopPlayersSlide(team, topPlayers, contextLabel),
      drawOutroSlide(team, stats, contextLabel),
    ]);

    setLoading(false);
    setReady(true);
    setActiveSlide(0);
  }

  async function drawHookSlide(team: Team, stats: TeamStats, contextLabel: string) {
    const canvas = canvasRefs[0].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, "ÉQUIPE À SUIVRE", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 0, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    if (team.head_coach) {
      ctx.fillStyle = COLORS.orange;
      ctx.font = "800 18px Montserrat, sans-serif";
      ctx.fillText(`COACH : ${team.head_coach.toUpperCase()}`, PADDING, 100);
    }

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 62px Anton, sans-serif";
    const nameLines = wrapLines(ctx, team.name.toUpperCase(), WIDTH - PADDING * 2);
    let ny = 175;
    nameLines.forEach((line) => {
      ctx.fillText(line, PADDING, ny);
      ny += 62;
    });

    if (stats.gamesPlayed > 0) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = "900 34px Anton, sans-serif";
      ctx.fillText(`${stats.wins}V - ${stats.losses}D`, PADDING, ny + 44);
      ny += 44;
    }

    const dividerY = ny + 30;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, dividerY);
    ctx.lineTo(WIDTH - PADDING, dividerY);
    ctx.stroke();

    const hookY = dividerY + 60;
    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 22px Anton, sans-serif";
    ctx.fillText("│", PADDING, hookY);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 24px Montserrat, sans-serif";
    const hookText =
      aiHook.trim() ||
      (stats.ppg != null
        ? `${stats.ppg.toFixed(1)} points marqués par match cette saison.`
        : `Zoom sur ${team.name}.`);
    const hookLines = wrapLines(ctx, hookText, WIDTH - PADDING * 2 - 24);
    let hy = hookY;
    hookLines.forEach((line) => {
      ctx.fillText(line, PADDING + 20, hy);
      hy += 32;
    });

    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 22px Montserrat, sans-serif";
    ctx.fillText("GLISSE POUR VOIR LE BILAN →", PADDING, HEIGHT - 150);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawStatsSlide(team: Team, stats: TeamStats, contextLabel: string) {
    const canvas = canvasRefs[1].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT);
    paintCompactHeader(ctx, "BILAN DE SAISON", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 1, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.white;
    ctx.font = "900 36px Anton, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(team.name.toUpperCase(), PADDING, 105);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, 128);
    ctx.lineTo(WIDTH - PADDING, 128);
    ctx.stroke();

    const cards: { label: string; value: string; accent?: boolean }[] = [
      { label: "BILAN", value: `${stats.wins}V-${stats.losses}D`, accent: true },
      { label: "MATCHS JOUÉS", value: String(stats.gamesPlayed) },
      { label: "PTS MARQUÉS/MATCH", value: stats.ppg != null ? stats.ppg.toFixed(1) : "-" },
      { label: "PTS ENCAISSÉS/MATCH", value: stats.oppg != null ? stats.oppg.toFixed(1) : "-" },
    ];

    const cols = 2;
    const gap = 18;
    const cardW = (WIDTH - PADDING * 2 - gap) / cols;
    const cardH = 150;
    const startY = 165;

    cards.forEach((card, i) => {
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

      ctx.fillStyle = card.accent ? COLORS.gold : COLORS.orange;
      ctx.font = "900 44px Anton, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(card.value, x + 22, y + 78);

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "700 14px Montserrat, sans-serif";
      ctx.fillText(card.label, x + 22, y + 112);
    });

    if (stats.diff != null) {
      const diffY = startY + Math.ceil(cards.length / cols) * (cardH + gap) + 50;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "600 18px Montserrat, sans-serif";
      ctx.fillText("DIFFÉRENTIEL DE POINTS", WIDTH / 2, diffY);
      ctx.fillStyle = stats.diff >= 0 ? COLORS.gold : "rgba(255,90,90,0.85)";
      ctx.font = "900 50px Anton, sans-serif";
      ctx.fillText(`${stats.diff >= 0 ? "+" : ""}${stats.diff.toFixed(1)}`, WIDTH / 2, diffY + 56);
    }

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawTopPlayersSlide(team: Team, players: TopPlayer[], contextLabel: string) {
    const canvas = canvasRefs[2].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, "MEILLEURS JOUEURS", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 2, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.white;
    ctx.font = "900 32px Anton, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(team.name.toUpperCase(), PADDING, 100);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 17px Montserrat, sans-serif";
    ctx.fillText("Classés par impact (PIR)", PADDING, 124);

    if (players.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "600 20px Montserrat, sans-serif";
      ctx.fillText("Pas encore de données individuelles.", PADDING, 220);
    }

    const rowH = 170;
    const startY = 170;

    players.forEach((p, i) => {
      const y = startY + i * rowH;

      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      roundRect(ctx, PADDING, y, WIDTH - PADDING * 2, rowH - 20, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COLORS.gold;
      ctx.font = "900 30px Anton, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`#${i + 1}`, PADDING + 24, y + 46);

      ctx.fillStyle = COLORS.white;
      ctx.font = "800 26px Montserrat, sans-serif";
      ctx.fillText(p.player_name, PADDING + 90, y + 46);

      const statLine = [
        p.ppg != null ? `${p.ppg.toFixed(1)} PTS` : null,
        p.rpg != null ? `${p.rpg.toFixed(1)} REB` : null,
        p.apg != null ? `${p.apg.toFixed(1)} AST` : null,
      ]
        .filter(Boolean)
        .join("  ·  ");
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "600 18px Montserrat, sans-serif";
      ctx.fillText(statLine || "-", PADDING + 90, y + 80);

      if (p.pir != null) {
        ctx.fillStyle = COLORS.orange;
        ctx.font = "900 26px Anton, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(p.pir.toFixed(1), WIDTH - PADDING - 24, y + 60);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "700 11px Montserrat, sans-serif";
        ctx.fillText("IMPACT", WIDTH - PADDING - 24, y + 82);
      }
    });

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawOutroSlide(team: Team, stats: TeamStats, contextLabel: string) {
    const canvas = canvasRefs[3].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, "EN RÉSUMÉ", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 3, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 50px Anton, sans-serif";
    const lines = wrapLines(ctx, team.name.toUpperCase(), WIDTH - PADDING * 2);
    let ny = 155;
    lines.forEach((line) => {
      ctx.fillText(line, PADDING, ny);
      ny += 52;
    });

    if (team.assistant_coach || team.head_coach) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "600 16px Montserrat, sans-serif";
      const staffLine = [
        team.head_coach ? `Coach : ${team.head_coach}` : null,
        team.assistant_coach ? `Assistant : ${team.assistant_coach}` : null,
      ]
        .filter(Boolean)
        .join("  ·  ");
      ctx.fillText(staffLine, PADDING, ny + 8);
      ny += 8;
    }

    const dividerY = ny + 30;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, dividerY);
    ctx.lineTo(WIDTH - PADDING, dividerY);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 20px Montserrat, sans-serif";
    const recapText =
      aiOutro.trim() ||
      `Cette saison : ${stats.wins}V-${stats.losses}D, ${stats.ppg != null ? stats.ppg.toFixed(1) : "-"} points de moyenne par match.`;
    const recapLines = wrapLines(ctx, recapText, WIDTH - PADDING * 2);
    let ry = dividerY + 40;
    recapLines.forEach((line) => {
      ctx.fillText(line, PADDING, ry);
      ry += 28;
    });

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
    const team = teams.find((t) => t.id === teamId);
    const name = (team?.name ?? "equipe").replace(/\s+/g, "-");
    downloadCanvasPng(canvas, `bsh-${name}-slide${index + 1}.png`);
  }

  async function downloadAllAsZip() {
    const team = teams.find((t) => t.id === teamId);
    const name = (team?.name ?? "equipe").replace(/\s+/g, "-");
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
    link.download = `bsh-team-breakdown-${name}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        TEAM BREAKDOWN
      </h1>
      <p className="text-sm text-white/50 mb-6">
        Génère un carrousel Instagram de 4 slides façon analyse d&apos;équipe : accroche, bilan, meilleurs
        joueurs, outro.
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
            onChange={(e) => {
              setCompetition(e.target.value as Competition);
              setAiHook("");
              setAiOutro("");
              setAiError(null);
            }}
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
          {teams.length === 0 && (
            <p className="text-xs text-white/40 mt-1">Aucune équipe pour cette ligue.</p>
          )}
        </div>
      </div>

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 mb-6 max-w-2xl">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <p className="text-sm font-semibold text-white/80">
            Texte d&apos;analyse (accroche + outro) — généré par IA
          </p>
          <button
            onClick={generateAiCopy}
            disabled={aiLoading || !teamId}
            className="bg-bsh-gold text-black text-xs font-bold rounded-lg px-3.5 py-2 hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {aiLoading ? "Génération..." : aiHook ? "Régénérer le texte" : "Générer le texte (IA)"}
          </button>
        </div>
        {aiError && <p className="text-red-400 text-xs mb-2">{aiError}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Accroche (slide 1)</label>
            <textarea
              value={aiHook}
              onChange={(e) => setAiHook(e.target.value)}
              placeholder="Laisse vide pour garder le texte par défaut."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Outro (slide 4)</label>
            <textarea
              value={aiOutro}
              onChange={(e) => setAiOutro(e.target.value)}
              placeholder="Laisse vide pour garder le texte par défaut."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none resize-none"
            />
          </div>
        </div>
        <p className="text-[11px] text-white/30 mt-2">
          Relis et corrige si besoin, puis clique « Générer le carrousel » pour appliquer ce texte aux slides.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={generate}
          disabled={loading || !teamId}
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
        {[0, 1, 2, 3].map((i) => (
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
