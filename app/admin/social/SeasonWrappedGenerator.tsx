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

type RankingRow = {
  player_id: string;
  player_name: string;
  team_name: string | null;
  league_name: string | null;
  games_played: number | null;
  ppg: number | null;
  apg: number | null;
  spg: number | null;
  bpg: number | null;
  pir: number | null;
};

type League = { id: string; slug: string; name: string };
type TeamRow = { id: string; name: string; league_id: string };
type TeamRecord = { teamId: string; name: string; wins: number; losses: number };
type ChiffreChoc = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  totalPoints: number;
  gameDate: string | null;
};

const SLIDE_COUNT = 8;
const SLIDE_LABELS = [
  "Couverture",
  "MVP saison",
  "Meilleur scoreur",
  "Meilleur passeur",
  "Meilleur défenseur",
  "Équipe dominante",
  "Chiffre choc",
  "Outro",
];
const MIN_GAMES = 3;

function PickSelector<T>({
  label,
  options,
  idx,
  onChange,
  render,
}: {
  label: string;
  options: T[];
  idx: number;
  onChange: (i: number) => void;
  render: (item: T) => string;
}) {
  if (options.length === 0) return null;
  return (
    <div className="mb-3">
      <label className="block text-xs text-white/40 mb-1">{label}</label>
      <select
        value={idx}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none"
      >
        {options.map((opt, i) => (
          <option key={i} value={i}>
            {render(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SeasonWrappedGenerator() {
  const [seasonLabel, setSeasonLabel] = useState("Saison 2025-2026");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [teamRecords, setTeamRecords] = useState<TeamRecord[]>([]);
  const [chiffreChocCandidates, setChiffreChocCandidates] = useState<ChiffreChoc[]>([]);

  const [mvpIdx, setMvpIdx] = useState(0);
  const [scorerIdx, setScorerIdx] = useState(0);
  const [passerIdx, setPasserIdx] = useState(0);
  const [defenderIdx, setDefenderIdx] = useState(0);
  const [teamIdx, setTeamIdx] = useState(0);
  const [chiffreIdx, setChiffreIdx] = useState(0);

  const [aiHook, setAiHook] = useState("");
  const [aiOutro, setAiOutro] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const canvasRefs = [
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
    useRef<HTMLCanvasElement>(null),
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

    async function loadData() {
      setLoadingData(true);

      const { data: rankingRows } = await supabase
        .from("global_rankings")
        .select("player_id, player_name, team_name, league_name, games_played, ppg, apg, spg, bpg, pir")
        .eq("league_slug", league!.slug)
        .gte("games_played", MIN_GAMES);
      setRankings((rankingRows ?? []) as RankingRow[]);

      const { data: teams } = await supabase
        .from("teams")
        .select("id, name, league_id")
        .eq("league_id", leagueId);
      const { data: games } = await supabase
        .from("games")
        .select("home_team_id, away_team_id, home_score, away_score, status, game_date")
        .eq("league_id", leagueId)
        .eq("status", "completed");

      const recordByTeam = new Map<string, { wins: number; losses: number }>();
      (teams as TeamRow[] | null)?.forEach((t) => recordByTeam.set(t.id, { wins: 0, losses: 0 }));

      const chocCandidates: ChiffreChoc[] = [];
      const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

      (games ?? []).forEach((g) => {
        if (g.home_score == null || g.away_score == null) return;
        const homeRec = recordByTeam.get(g.home_team_id);
        const awayRec = recordByTeam.get(g.away_team_id);
        if (g.home_score > g.away_score) {
          if (homeRec) homeRec.wins += 1;
          if (awayRec) awayRec.losses += 1;
        } else if (g.away_score > g.home_score) {
          if (awayRec) awayRec.wins += 1;
          if (homeRec) homeRec.losses += 1;
        }
        chocCandidates.push({
          homeTeam: teamNameById.get(g.home_team_id) ?? "?",
          awayTeam: teamNameById.get(g.away_team_id) ?? "?",
          homeScore: g.home_score,
          awayScore: g.away_score,
          totalPoints: g.home_score + g.away_score,
          gameDate: g.game_date,
        });
      });

      const records: TeamRecord[] = (teams as TeamRow[] | null ?? [])
        .map((t) => {
          const rec = recordByTeam.get(t.id) ?? { wins: 0, losses: 0 };
          return { teamId: t.id, name: t.name, wins: rec.wins, losses: rec.losses };
        })
        .filter((r) => r.wins + r.losses >= MIN_GAMES)
        .sort((a, b) => b.wins / (b.wins + b.losses) - a.wins / (a.wins + a.losses));
      setTeamRecords(records);

      chocCandidates.sort((a, b) => b.totalPoints - a.totalPoints);
      setChiffreChocCandidates(chocCandidates.slice(0, 5));

      setLoadingData(false);
    }
    loadData();
  }, [supabase, leagueId, leagues]);

  const selectedLeague = leagues.find((l) => l.id === leagueId) ?? null;
  const contextLabel = `${selectedLeague?.slug.toUpperCase() ?? ""} · ${seasonLabel.toUpperCase()}`;

  function selectLeague(id: string) {
    setLeagueId(id);
    setMvpIdx(0);
    setScorerIdx(0);
    setPasserIdx(0);
    setDefenderIdx(0);
    setTeamIdx(0);
    setChiffreIdx(0);
    setAiHook("");
    setAiOutro("");
    setAiError(null);
    setReady(false);
  }

  const byPir = [...rankings].sort((a, b) => (b.pir ?? 0) - (a.pir ?? 0)).slice(0, 3);
  const byPpg = [...rankings].sort((a, b) => (b.ppg ?? 0) - (a.ppg ?? 0)).slice(0, 3);
  const byApg = [...rankings].sort((a, b) => (b.apg ?? 0) - (a.apg ?? 0)).slice(0, 3);
  const byDef = [...rankings]
    .sort((a, b) => (b.spg ?? 0) + (b.bpg ?? 0) - ((a.spg ?? 0) + (a.bpg ?? 0)))
    .slice(0, 3);

  const mvp = byPir[mvpIdx] ?? null;
  const topScorer = byPpg[scorerIdx] ?? null;
  const topPasser = byApg[passerIdx] ?? null;
  const topDefender = byDef[defenderIdx] ?? null;
  const dominantTeam = teamRecords[teamIdx] ?? null;
  const chiffreChoc = chiffreChocCandidates[chiffreIdx] ?? null;

  async function generateAiCopy() {
    if (!mvp) {
      setAiError("Données pas encore chargées.");
      return;
    }
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await fetch("/api/social-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "seasonWrapped",
          seasonLabel,
          leagueName: selectedLeague?.name ?? "",
          mvp: { name: mvp.player_name, team: mvp.team_name, pir: mvp.pir },
          topScorer: { name: topScorer?.player_name ?? "", team: topScorer?.team_name ?? null, ppg: topScorer?.ppg ?? null },
          topPasser: { name: topPasser?.player_name ?? "", team: topPasser?.team_name ?? null, apg: topPasser?.apg ?? null },
          topDefender: {
            name: topDefender?.player_name ?? "",
            team: topDefender?.team_name ?? null,
            value: topDefender ? (topDefender.spg ?? 0) + (topDefender.bpg ?? 0) : null,
          },
          dominantTeam: { name: dominantTeam?.name ?? null, wins: dominantTeam?.wins ?? 0, losses: dominantTeam?.losses ?? 0 },
          chiffreChoc: chiffreChoc
            ? { homeTeam: chiffreChoc.homeTeam, awayTeam: chiffreChoc.awayTeam, totalPoints: chiffreChoc.totalPoints }
            : null,
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

  async function drawCoverSlide() {
    const canvas = canvasRefs[0].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.1);
    paintCompactHeader(ctx, "BSH WRAPPED", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 0, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 22px Montserrat, sans-serif";
    ctx.fillText(seasonLabel.toUpperCase(), PADDING, 300);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 84px Anton, sans-serif";
    ctx.fillText("BSH", PADDING, 400);
    ctx.fillStyle = COLORS.gold;
    ctx.fillText("WRAPPED", PADDING, 480);

    const dividerY = 520;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, dividerY);
    ctx.lineTo(WIDTH - PADDING, dividerY);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "500 24px Montserrat, sans-serif";
    const hookText =
      aiHook.trim() || `Le récap complet de la saison ${selectedLeague?.name ?? ""}.`;
    const hookLines = wrapLines(ctx, hookText, WIDTH - PADDING * 2);
    let hy = dividerY + 50;
    hookLines.forEach((line) => {
      ctx.fillText(line, PADDING, hy);
      hy += 32;
    });

    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 22px Montserrat, sans-serif";
    ctx.fillText("GLISSE POUR DÉCOUVRIR →", PADDING, HEIGHT - 150);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawStatSlide(
    index: number,
    kicker: string,
    playerName: string,
    teamName: string | null,
    valueLabel: string,
    valueText: string
  ) {
    const canvas = canvasRefs[index].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, kicker, contextLabel, WIDTH);
    paintSlideIndicator(ctx, index, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    ctx.fillStyle = COLORS.orange;
    ctx.font = "800 20px Montserrat, sans-serif";
    ctx.fillText((teamName ?? "").toUpperCase(), PADDING, 400);

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 60px Anton, sans-serif";
    const nameLines = wrapLines(ctx, playerName.toUpperCase(), WIDTH - PADDING * 2);
    let ny = 470;
    nameLines.forEach((line) => {
      ctx.fillText(line, PADDING, ny);
      ny += 62;
    });

    const dividerY = ny + 20;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, dividerY);
    ctx.lineTo(WIDTH - PADDING, dividerY);
    ctx.stroke();

    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 56px Anton, sans-serif";
    ctx.fillText(valueText, PADDING, dividerY + 80);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "700 18px Montserrat, sans-serif";
    ctx.fillText(valueLabel.toUpperCase(), PADDING, dividerY + 108);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawTeamSlide() {
    const canvas = canvasRefs[5].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, "ÉQUIPE DOMINANTE", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 5, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 60px Anton, sans-serif";
    const nameLines = wrapLines(ctx, (dominantTeam?.name ?? "—").toUpperCase(), WIDTH - PADDING * 2);
    let ny = 460;
    nameLines.forEach((line) => {
      ctx.fillText(line, PADDING, ny);
      ny += 62;
    });

    const dividerY = ny + 20;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PADDING, dividerY);
    ctx.lineTo(WIDTH - PADDING, dividerY);
    ctx.stroke();

    const winPct = dominantTeam
      ? Math.round((dominantTeam.wins / (dominantTeam.wins + dominantTeam.losses)) * 100)
      : 0;

    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 56px Anton, sans-serif";
    ctx.fillText(dominantTeam ? `${dominantTeam.wins}V-${dominantTeam.losses}D` : "—", PADDING, dividerY + 80);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "700 18px Montserrat, sans-serif";
    ctx.fillText(`${winPct}% DE VICTOIRES`, PADDING, dividerY + 108);

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawChiffreChocSlide() {
    const canvas = canvasRefs[6].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, "LE MATCH LE PLUS EXPLOSIF", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 6, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    if (chiffreChoc) {
      ctx.fillStyle = COLORS.white;
      ctx.font = "900 40px Anton, sans-serif";
      const matchupLines = wrapLines(
        ctx,
        `${chiffreChoc.homeTeam.toUpperCase()} VS ${chiffreChoc.awayTeam.toUpperCase()}`,
        WIDTH - PADDING * 2
      );
      let ny = 420;
      matchupLines.forEach((line) => {
        ctx.fillText(line, PADDING, ny);
        ny += 46;
      });

      const dividerY = ny + 20;
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PADDING, dividerY);
      ctx.lineTo(WIDTH - PADDING, dividerY);
      ctx.stroke();

      ctx.fillStyle = COLORS.gold;
      ctx.font = "900 64px Anton, sans-serif";
      ctx.fillText(`${chiffreChoc.homeScore} - ${chiffreChoc.awayScore}`, PADDING, dividerY + 90);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "700 18px Montserrat, sans-serif";
      ctx.fillText(`${chiffreChoc.totalPoints} POINTS CUMULÉS`, PADDING, dividerY + 120);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "600 24px Montserrat, sans-serif";
      ctx.fillText("Pas assez de données pour ce classement.", PADDING, 460);
    }

    paintFooter(ctx, WIDTH, HEIGHT);
  }

  async function drawOutroSlide() {
    const canvas = canvasRefs[7].current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    await loadBrandFonts();

    paintBackground(ctx, WIDTH, HEIGHT);
    await paintCourtPattern(ctx, WIDTH, HEIGHT, 0.08);
    paintCompactHeader(ctx, "MERCI POUR CETTE SAISON", contextLabel, WIDTH);
    paintSlideIndicator(ctx, 7, SLIDE_COUNT, WIDTH);

    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    ctx.fillStyle = COLORS.white;
    ctx.font = "900 48px Anton, sans-serif";
    ctx.fillText("BSH WRAPPED", PADDING, 200);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 22px Montserrat, sans-serif";
    const recapText =
      aiOutro.trim() ||
      `Une saison marquée par le talent de ${selectedLeague?.name ?? "cette ligue"} — la suite arrive bientôt.`;
    const recapLines = wrapLines(ctx, recapText, WIDTH - PADDING * 2);
    let ry = 250;
    recapLines.forEach((line) => {
      ctx.fillText(line, PADDING, ry);
      ry += 30;
    });

    const ctaY = HEIGHT - 280;
    const ctaH = 130;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.strokeStyle = "rgba(255,214,10,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING + 14, ctaY);
    ctx.lineTo(WIDTH - PADDING - 14, ctaY);
    ctx.arcTo(WIDTH - PADDING, ctaY, WIDTH - PADDING, ctaY + 14, 14);
    ctx.lineTo(WIDTH - PADDING, ctaY + ctaH - 14);
    ctx.arcTo(WIDTH - PADDING, ctaY + ctaH, WIDTH - PADDING - 14, ctaY + ctaH, 14);
    ctx.lineTo(PADDING + 14, ctaY + ctaH);
    ctx.arcTo(PADDING, ctaY + ctaH, PADDING, ctaY + ctaH - 14, 14);
    ctx.lineTo(PADDING, ctaY + 14);
    ctx.arcTo(PADDING, ctaY, PADDING + 14, ctaY, 14);
    ctx.closePath();
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

  async function generate() {
    if (!mvp || !topScorer || !topPasser || !topDefender) {
      setError("Données insuffisantes pour générer le Wrapped (pas assez de joueurs avec des stats).");
      return;
    }
    setError(null);
    setLoading(true);
    setReady(false);

    await Promise.all([
      drawCoverSlide(),
      drawStatSlide(1, "MVP SAISON", mvp.player_name, mvp.team_name, "IMPACT", mvp.pir?.toFixed(1) ?? "-"),
      drawStatSlide(2, "MEILLEUR SCOREUR", topScorer.player_name, topScorer.team_name, "POINTS/MATCH", topScorer.ppg?.toFixed(1) ?? "-"),
      drawStatSlide(3, "MEILLEUR PASSEUR", topPasser.player_name, topPasser.team_name, "PASSES/MATCH", topPasser.apg?.toFixed(1) ?? "-"),
      drawStatSlide(
        4,
        "MEILLEUR DÉFENSEUR",
        topDefender.player_name,
        topDefender.team_name,
        "INTERCEPTIONS + CONTRES/MATCH",
        ((topDefender.spg ?? 0) + (topDefender.bpg ?? 0)).toFixed(1)
      ),
      drawTeamSlide(),
      drawChiffreChocSlide(),
      drawOutroSlide(),
    ]);

    setLoading(false);
    setReady(true);
    setActiveSlide(0);
  }

  function downloadSlide(index: number) {
    const canvas = canvasRefs[index].current;
    if (!canvas) return;
    downloadCanvasPng(canvas, `bsh-wrapped-slide${index + 1}.png`);
  }

  async function downloadAllAsZip() {
    const zip = new JSZip();
    canvasRefs.forEach((ref, i) => {
      const canvas = ref.current;
      if (!canvas) return;
      const base64 = canvas.toDataURL("image/png").split(",")[1];
      zip.file(`bsh-wrapped-slide${i + 1}.png`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "bsh-wrapped.zip";
    link.click();
  }

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        SEASON WRAPPED
      </h1>
      <p className="text-sm text-white/50 mb-6">
        Récap de fin de saison, une ligue à la fois. Le système calcule les highlights
        automatiquement — ajuste chaque catégorie ci-dessous si besoin avant de générer.
      </p>

      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm text-white/60 mb-1">Ligue</label>
          <select
            value={leagueId}
            onChange={(e) => selectLeague(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="max-w-md">
          <label className="block text-sm text-white/60 mb-1">Nom de la saison</label>
          <input
            value={seasonLabel}
            onChange={(e) => setSeasonLabel(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:border-bsh-orange outline-none"
          />
        </div>
      </div>

      {loadingData ? (
        <p className="text-sm text-white/40 mb-6">Calcul des highlights de la saison...</p>
      ) : (
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 mb-6 max-w-2xl">
          <p className="text-sm font-semibold text-white/80 mb-3">
            Highlights proposés — ajuste si besoin
          </p>
          <div className="grid sm:grid-cols-2 gap-x-4">
            <PickSelector
              label="MVP saison (impact)"
              options={byPir}
              idx={mvpIdx}
              onChange={setMvpIdx}
              render={(p) => `${p.player_name} — ${p.pir?.toFixed(1) ?? "-"} (${p.team_name ?? "?"})`}
            />
            <PickSelector
              label="Meilleur scoreur"
              options={byPpg}
              idx={scorerIdx}
              onChange={setScorerIdx}
              render={(p) => `${p.player_name} — ${p.ppg?.toFixed(1) ?? "-"} pts (${p.team_name ?? "?"})`}
            />
            <PickSelector
              label="Meilleur passeur"
              options={byApg}
              idx={passerIdx}
              onChange={setPasserIdx}
              render={(p) => `${p.player_name} — ${p.apg?.toFixed(1) ?? "-"} pd (${p.team_name ?? "?"})`}
            />
            <PickSelector
              label="Meilleur défenseur"
              options={byDef}
              idx={defenderIdx}
              onChange={setDefenderIdx}
              render={(p) => `${p.player_name} — ${((p.spg ?? 0) + (p.bpg ?? 0)).toFixed(1)} (${p.team_name ?? "?"})`}
            />
            <PickSelector
              label="Équipe dominante"
              options={teamRecords}
              idx={teamIdx}
              onChange={setTeamIdx}
              render={(t) => `${t.name} — ${t.wins}V-${t.losses}D`}
            />
            <PickSelector
              label="Match le plus explosif"
              options={chiffreChocCandidates}
              idx={chiffreIdx}
              onChange={setChiffreIdx}
              render={(c) => `${c.homeTeam} vs ${c.awayTeam} — ${c.totalPoints} pts`}
            />
          </div>
        </div>
      )}

      <div className="border border-white/10 rounded-lg p-4 bg-white/5 mb-6 max-w-2xl">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <p className="text-sm font-semibold text-white/80">
            Texte d&apos;analyse (couverture + outro) — généré par IA
          </p>
          <button
            onClick={generateAiCopy}
            disabled={aiLoading || loadingData}
            className="bg-bsh-gold text-black text-xs font-bold rounded-lg px-3.5 py-2 hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {aiLoading ? "Génération..." : aiHook ? "Régénérer le texte" : "Générer le texte (IA)"}
          </button>
        </div>
        {aiError && <p className="text-red-400 text-xs mb-2">{aiError}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Accroche (couverture)</label>
            <textarea
              value={aiHook}
              onChange={(e) => setAiHook(e.target.value)}
              placeholder="Laisse vide pour garder le texte par défaut."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Outro</label>
            <textarea
              value={aiOutro}
              onChange={(e) => setAiOutro(e.target.value)}
              placeholder="Laisse vide pour garder le texte par défaut."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-bsh-orange outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* eslint-disable react-hooks/immutability -- generate() dessine sur des canvas natifs
          (mutation de canvas.width/height), pas du state React ; même pattern impératif que
          PlayerCarouselGenerator/TeamBreakdownGenerator. */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={generate}
          disabled={loading || loadingData}
          className="bg-bsh-orange text-black font-bold rounded-lg px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Génération..." : "Générer le Wrapped"}
        </button>
        {ready && (
          <>
            <button
              onClick={() => downloadSlide(activeSlide)}
              className="bg-white/10 text-white font-semibold rounded-lg px-4 py-2.5 hover:bg-white/20 transition-colors"
            >
              Télécharger cette slide
            </button>
            <button
              onClick={downloadAllAsZip}
              className="bg-white/10 text-white font-semibold rounded-lg px-4 py-2.5 hover:bg-white/20 transition-colors"
            >
              Télécharger tout (ZIP)
            </button>
          </>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {ready && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {SLIDE_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              className={`text-xs font-semibold rounded-full px-3 py-1.5 transition-colors ${
                activeSlide === i ? "bg-bsh-orange text-black" : "bg-white/5 text-white/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <canvas
            key={i}
            ref={canvasRefs[i]}
            style={{ width: "min(100%, 380px)", display: ready && activeSlide === i ? "block" : "none" }}
            className="rounded-xl border border-white/10"
          />
        ))}
      </div>
    </div>
  );
}
