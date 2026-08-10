import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

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
                    #{s.player?.jersey_number ?? "-"} {s.player?.name}
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

      {renderTable(homeTeam.name, homeStats)}
      {renderTable(awayTeam.name, awayStats)}
    </div>
  );
}
