import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/app/Breadcrumb";
import Avatar from "@/app/Avatar";
import PlayerTrendChart from "./PlayerTrendChart";

export const revalidate = 60;

type SeasonStat = {
  games_played: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  ts_pct: number;
  pir: number;
};

type GameLogRow = {
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  min: number | null;
  game: {
    id: string;
    game_date: string;
    home_team_id: string;
    away_team_id: string;
    home_score: number | null;
    away_score: number | null;
    home_team: { name: string } | null;
    away_team: { name: string } | null;
  } | null;
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string; playerId: string }>;
}) {
  const { slug, playerId } = await params;

  const { data: player } = await supabase
    .from("players")
    .select("*, team:team_id(id, name)")
    .eq("id", playerId)
    .single();

  if (!player) notFound();

  const team = player.team as unknown as { id: string; name: string };

  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("slug", slug)
    .single();

  const { data: seasonStatsArr } = await supabase
    .from("player_season_stats")
    .select("*")
    .eq("player_id", playerId)
    .limit(1);

  const seasonStats = (seasonStatsArr?.[0] as SeasonStat | undefined) ?? null;

  const { data: gameLog } = await supabase
    .from("player_game_stats")
    .select(
      "pts, reb, ast, stl, blk, min, game:game_id(id, game_date, home_team_id, away_team_id, home_score, away_score, home_team:home_team_id(name), away_team:away_team_id(name))"
    )
    .eq("player_id", playerId)
    .order("game_date", { referencedTable: "game", ascending: false });

  const rows = (gameLog ?? []) as unknown as GameLogRow[];

  const chartData = [...rows]
    .filter((r) => r.game)
    .reverse() // du plus ancien au plus récent pour le graphique
    .map((r) => ({
      date: r.game!.game_date,
      label: new Date(r.game!.game_date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      }),
      pts: r.pts,
      reb: r.reb,
      ast: r.ast,
    }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: league?.name ?? "Ligue", href: `/${slug}` },
          { label: team?.name ?? "Équipe", href: `/${slug}/equipe/${team?.id}` },
          { label: player.name },
        ]}
      />

      <div className="flex items-center gap-4 mb-2">
        <Avatar name={player.name} src={player.photo_url} size={56} />
        <div>
          <h1 className="font-display text-2xl text-bsh-orange tracking-wide">
            {player.name}
          </h1>
          <span className="text-white/50 text-sm">
            #{player.jersey_number ?? "-"} · {player.position ?? "-"}
          </span>
        </div>
      </div>
      {team && (
        <Link
          href={`/${slug}/equipe/${team.id}`}
          className="text-sm text-white/50 hover:text-bsh-orange mb-6 inline-block"
        >
          {team.name}
        </Link>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
        {[
          { label: "MJ", value: seasonStats?.games_played ?? "-" },
          { label: "PPG", value: seasonStats?.ppg?.toFixed(1) ?? "-" },
          { label: "RPG", value: seasonStats?.rpg?.toFixed(1) ?? "-" },
          { label: "APG", value: seasonStats?.apg?.toFixed(1) ?? "-" },
          {
            label: "TS%",
            value: seasonStats?.ts_pct ? `${seasonStats.ts_pct.toFixed(1)}%` : "-",
          },
          { label: "PIR", value: seasonStats?.pir?.toFixed(1) ?? "-" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-white/10 rounded-lg p-3 text-center bg-white/5"
          >
            <p className="font-display text-2xl text-bsh-gold">
              {stat.value}
            </p>
            <p className="text-xs text-white/50 uppercase mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <PlayerTrendChart data={chartData} />

      <h2 className="font-display text-sm text-bsh-gold mb-2 tracking-wide">
        HISTORIQUE DES MATCHS
      </h2>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Match</th>
                <th className="py-2 px-2 text-center">MIN</th>
                <th className="py-2 px-2 text-center">PTS</th>
                <th className="py-2 px-2 text-center">REB</th>
                <th className="py-2 px-2 text-center">AST</th>
                <th className="py-2 px-2 text-center">STL</th>
                <th className="py-2 px-2 text-center">BLK</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const g = row.game;
                if (!g) return null;
                return (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white/50 whitespace-nowrap">
                      {g.game_date}
                    </td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/${slug}/match/${g.id}`}
                        className="hover:text-bsh-orange whitespace-nowrap"
                      >
                        {g.home_team?.name} vs {g.away_team?.name}
                      </Link>
                    </td>
                    <td className="py-2 px-2 text-center">{row.min ?? "-"}</td>
                    <td className="py-2 px-2 text-center text-bsh-orange font-bold">
                      {row.pts ?? "-"}
                    </td>
                    <td className="py-2 px-2 text-center">{row.reb ?? "-"}</td>
                    <td className="py-2 px-2 text-center">{row.ast ?? "-"}</td>
                    <td className="py-2 px-2 text-center">{row.stl ?? "-"}</td>
                    <td className="py-2 px-2 text-center">{row.blk ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-white/50">Aucun match enregistré pour ce joueur.</p>
      )}
    </div>
  );
}
