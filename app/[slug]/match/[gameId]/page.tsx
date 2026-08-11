import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/app/Breadcrumb";

export const revalidate = 60;

type PlayerStatRow = {
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  min: number | null;
  player: { id: string; name: string; jersey_number: number | null } | null;
};

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ slug: string; gameId: string }>;
}) {
  const { slug, gameId } = await params;

  const { data: game } = await supabase
    .from("games")
    .select(
      "*, home_team:home_team_id(id,name), away_team:away_team_id(id,name)"
    )
    .eq("id", gameId)
    .single();

  if (!game) notFound();

  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("slug", slug)
    .single();

  const homeTeam = game.home_team as unknown as { id: string; name: string };
  const awayTeam = game.away_team as unknown as { id: string; name: string };

  const { data: stats } = await supabase
    .from("player_game_stats")
    .select("pts, reb, ast, stl, blk, min, player:player_id(id, name, jersey_number, team_id)")
    .eq("game_id", gameId);

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
      <div className="mb-10">
        <h2 className="font-display text-xl text-bsh-gold mb-4 tracking-wide">
          {teamName}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-4">Joueur</th>
                <th className="py-2 px-2 text-center">MIN</th>
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
                  <td className="py-2 px-2 text-center">{s.min ?? "-"}</td>
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
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Breadcrumb
        items={[
          { label: league?.name ?? "Ligue", href: `/${slug}` },
          { label: "Matchs", href: `/${slug}/matchs` },
          { label: `${homeTeam.name} vs ${awayTeam.name}` },
        ]}
      />
      <div className="mb-2">
        <h1 className="font-display text-3xl text-bsh-orange tracking-wide">
          {homeTeam.name} VS {awayTeam.name}
        </h1>
      </div>
      <p className="text-white/50 mb-4">
        {game.game_date} · {game.phase ?? "Saison régulière"}
      </p>

      {game.status === "completed" && (
        <p className="font-display text-4xl text-bsh-gold mb-10">
          {game.home_score} - {game.away_score}
        </p>
      )}

      {playerOfGame && playerOfGame.player && (
        <div className="border border-bsh-orange/40 bg-bsh-orange/5 rounded-lg p-4 mb-10 flex items-center gap-4">
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
    </div>
  );
}
