import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/app/Breadcrumb";
import Avatar from "@/app/Avatar";

export const revalidate = 60;

type SeasonStat = {
  player_id: string;
  games_played: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  ts_pct: number;
  pir: number;
};

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string; teamId: string }>;
}) {
  const { slug, teamId } = await params;

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (!team) notFound();

  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("slug", slug)
    .single();

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("name");

  const playerIds = (players ?? []).map((p) => p.id);

  // global_rankings (pas player_season_stats) : inclut aussi les joueurs
  // sans suivi match par match (ex: AHBB, moyennes importées) -- sinon leur
  // ligne roster affiche 0 partout.
  const { data: seasonStats } = await supabase
    .from("global_rankings")
    .select("*")
    .in("player_id", playerIds.length > 0 ? playerIds : ["00000000-0000-0000-0000-000000000000"]);

  const statsByPlayer = new Map<string, SeasonStat>(
    (seasonStats ?? []).map((s) => [s.player_id, s as SeasonStat])
  );

  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq("status", "completed");

  let wins = 0;
  let losses = 0;
  (games ?? []).forEach((g) => {
    if (g.home_score === null || g.away_score === null) return;
    const isHome = g.home_team_id === teamId;
    const teamScore = isHome ? g.home_score : g.away_score;
    const oppScore = isHome ? g.away_score : g.home_score;
    if (teamScore > oppScore) wins += 1;
    else if (oppScore > teamScore) losses += 1;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: league?.name ?? "Ligue", href: `/${slug}` },
          { label: team.name },
        ]}
      />
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={team.name} src={team.logo_url} size={48} rounded="rounded-lg" />
        <h1 className="font-display text-2xl text-bsh-orange tracking-wide">
          {team.name}
        </h1>
        {wins + losses > 0 && (
          <span className="text-sm font-semibold text-white/50">
            {wins}V-{losses}D
          </span>
        )}
      </div>

      <h2 className="font-display text-sm text-bsh-gold mb-2 tracking-wide">
        ROSTER
      </h2>

      {players && players.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Nom</th>
                <th className="py-2 pr-4">Poste</th>
                <th className="py-2 px-2 text-center">MJ</th>
                <th className="py-2 px-2 text-center">PPG</th>
                <th className="py-2 px-2 text-center">RPG</th>
                <th className="py-2 px-2 text-center">APG</th>
                <th className="py-2 px-2 text-center">SPG</th>
                <th className="py-2 px-2 text-center">TS%</th>
                <th className="py-2 px-2 text-center">PIR</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const stats = statsByPlayer.get(p.id);
                return (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-white/60">
                      {p.jersey_number ?? "-"}
                    </td>
                    <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                      <Link
                        href={`/${slug}/joueur/${p.id}`}
                        className="hover:text-bsh-orange flex items-center gap-2"
                      >
                        <Avatar name={p.name} src={p.photo_url} size={28} />
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-white/60">
                      {p.position ?? "-"}
                    </td>
                    <td className="py-3 px-2 text-center text-white/60">
                      {stats?.games_played ?? "-"}
                    </td>
                    <td className="py-3 px-2 text-center text-bsh-orange font-bold">
                      {stats?.ppg?.toFixed(1) ?? "-"}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {stats?.rpg?.toFixed(1) ?? "-"}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {stats?.apg?.toFixed(1) ?? "-"}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {stats?.spg?.toFixed(1) ?? "-"}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {stats?.ts_pct ? `${stats.ts_pct.toFixed(1)}%` : "-"}
                    </td>
                    <td className="py-3 px-2 text-center text-bsh-gold font-bold">
                      {stats?.pir?.toFixed(1) ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {seasonStats?.length === 0 && (
            <p className="text-white/40 text-xs mt-3">
              Aucune stat de saison disponible pour le moment (matchs pas encore joués ou enregistrés).
            </p>
          )}
        </div>
      ) : (
        <p className="text-white/50">Roster à venir.</p>
      )}
    </div>
  );
}
