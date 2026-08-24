import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/app/Breadcrumb";
import LiveScoreboard from "@/app/LiveScoreboard";
import CourtDiagram from "@/app/CourtDiagram";
import PlayByPlay, { PlayByPlayEvent } from "@/app/PlayByPlay";
import { isLiveScoringEnabled } from "@/lib/settings";

export const revalidate = 60;

const ROUND_LABELS: Record<string, string> = {
  demi_finale_1: "Demi-finale 1",
  demi_finale_2: "Demi-finale 2",
  petite_finale: "Petite finale",
  finale: "Finale",
};

type PlayerStatRow = {
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  min: number | null;
  player: { id: string; name: string; jersey_number: number | null; team_id: string } | null;
};

export default async function PlayoffMatchPage({
  params,
}: {
  params: Promise<{ slug: string; gameId: string }>;
}) {
  const { slug, gameId } = await params;

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!league) notFound();

  const { data: game } = await supabase
    .from("playoff_games")
    .select(
      "*, team_home:team_home_id(id,name), team_away:team_away_id(id,name)"
    )
    .eq("id", gameId)
    .eq("league_id", league.id)
    .single();

  if (!game) notFound();

  const homeTeam = game.team_home as unknown as { id: string; name: string };
  const awayTeam = game.team_away as unknown as { id: string; name: string };

  const { data: stats } = await supabase
    .from("playoff_player_stats")
    .select(
      "pts, reb, ast, stl, blk, min, player:player_id(id, name, jersey_number, team_id)"
    )
    .eq("playoff_game_id", gameId);

  const { data: shots } = await supabase
    .from("game_events")
    .select("x, y, made, event_type")
    .eq("game_id", gameId)
    .eq("game_type", "playoff")
    .in("event_type", ["2PT", "3PT"]);

  const { data: allEvents } = await supabase
    .from("game_events")
    .select(
      "id, event_type, made, period, created_at, player:player_id(name, jersey_number, team_id)"
    )
    .eq("game_id", gameId)
    .eq("game_type", "playoff")
    .order("created_at", { ascending: false });

  const liveEnabled = await isLiveScoringEnabled();

  const homeStats = (stats ?? []).filter(
    (s) => (s.player as unknown as { team_id: string })?.team_id === homeTeam.id
  ) as unknown as PlayerStatRow[];
  const awayStats = (stats ?? []).filter(
    (s) => (s.player as unknown as { team_id: string })?.team_id === awayTeam.id
  ) as unknown as PlayerStatRow[];

  const allStats = [...homeStats, ...awayStats];
  const playerOfGame = allStats.reduce<PlayerStatRow | null>((best, s) => {
    const score =
      (s.pts ?? 0) + (s.reb ?? 0) + (s.ast ?? 0) + (s.stl ?? 0) + (s.blk ?? 0);
    const bestScore = best
      ? (best.pts ?? 0) +
        (best.reb ?? 0) +
        (best.ast ?? 0) +
        (best.stl ?? 0) +
        (best.blk ?? 0)
      : -1;
    return score > bestScore ? s : best;
  }, null);

  function renderTable(teamName: string, rows: PlayerStatRow[]) {
    return (
      <div className="mb-6">
        <h2 className="font-display text-sm text-bsh-gold mb-2 tracking-wide">
          {teamName}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-4">Joueur</th>
                <th className="py-2 px-2 text-center">PTS</th>
                <th className="py-2 px-2 text-center">REB</th>
                <th className="py-2 px-2 text-center">AST</th>
                <th className="py-2 px-2 text-center">STL</th>
                <th className="py-2 px-2 text-center">BLK</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-2 pr-4 font-semibold whitespace-nowrap">
                    <Link
                      href={`/${slug}/joueur/${s.player?.id}`}
                      className="hover:text-bsh-orange"
                    >
                      #{s.player?.jersey_number ?? "-"} {s.player?.name}
                    </Link>
                  </td>
                  <td className="py-2 px-2 text-center text-bsh-orange font-bold">
                    {s.pts ?? "-"}
                  </td>
                  <td className="py-2 px-2 text-center">{s.reb ?? "-"}</td>
                  <td className="py-2 px-2 text-center">{s.ast ?? "-"}</td>
                  <td className="py-2 px-2 text-center">{s.stl ?? "-"}</td>
                  <td className="py-2 px-2 text-center">{s.blk ?? "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-white/50">
                    Pas encore de stats pour ce match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: league.name, href: `/${slug}` },
          { label: "Playoffs", href: `/${slug}/playoffs` },
          { label: `${homeTeam.name} vs ${awayTeam.name}` },
        ]}
      />
      <div className="mb-2">
        <h1 className="font-display text-xl text-bsh-orange tracking-wide">
          {homeTeam.name} VS {awayTeam.name}
        </h1>
      </div>
      <p className="text-white/50 mb-4">
        {game.game_date} · {ROUND_LABELS[game.round] ?? game.round} · Match{" "}
        {game.game_number}
      </p>

      {game.status === "completed" && (
        <p className="font-display text-2xl text-bsh-gold mb-4">
          {game.home_score} - {game.away_score}
        </p>
      )}

      {liveEnabled && (
        <LiveScoreboard
          gameType="playoff"
          gameId={gameId}
          homeTeamName={homeTeam.name}
          awayTeamName={awayTeam.name}
          initialGame={{
            home_score: game.home_score,
            away_score: game.away_score,
            status: game.status,
            current_period: game.current_period,
            clock_display: game.clock_display,
          }}
          initialShots={shots ?? []}
        />
      )}

      {shots &&
        shots.length > 0 &&
        !(liveEnabled && game.status === "live") && (
          <div className="mb-6">
            <p className="text-xs text-white/40 uppercase tracking-wide mb-2">
              Shot chart
            </p>
            <div className="max-w-md">
              <CourtDiagram shots={shots} />
            </div>
          </div>
        )}

      {playerOfGame && playerOfGame.player && (
        <div className="border border-bsh-orange/40 bg-bsh-orange/5 rounded-lg p-4 mb-6 flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-xs text-bsh-gold uppercase tracking-wide font-semibold">
              Joueur du match
            </p>
            <p className="font-display text-lg">
              #{playerOfGame.player.jersey_number ?? "-"}{" "}
              {playerOfGame.player.name}
            </p>
            <p className="text-sm text-white/60">
              {playerOfGame.pts ?? 0} PTS · {playerOfGame.reb ?? 0} REB ·{" "}
              {playerOfGame.ast ?? 0} AST
            </p>
          </div>
        </div>
      )}

      {renderTable(homeTeam.name, homeStats)}
      {renderTable(awayTeam.name, awayStats)}

      <div className="mb-6">
        <h2 className="font-display text-sm text-bsh-gold mb-2 tracking-wide">
          Play-by-play
        </h2>
        <PlayByPlay
          events={(allEvents ?? []) as unknown as PlayByPlayEvent[]}
          homeTeamId={homeTeam.id}
          homeTeamName={homeTeam.name}
          awayTeamName={awayTeam.name}
        />
      </div>
    </div>
  );
}
