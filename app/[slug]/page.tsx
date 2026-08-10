import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!league) notFound();

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("league_id", league.id)
    .order("name");

  const { data: games } = await supabase
    .from("games")
    .select("home_team_id, away_team_id, home_score, away_score")
    .eq("league_id", league.id)
    .eq("status", "completed");

  const records = new Map<string, { wins: number; losses: number }>();
  (teams ?? []).forEach((t) => records.set(t.id, { wins: 0, losses: 0 }));

  (games ?? []).forEach((g) => {
    if (g.home_score === null || g.away_score === null) return;
    const home = records.get(g.home_team_id);
    const away = records.get(g.away_team_id);
    if (!home || !away) return;
    if (g.home_score > g.away_score) {
      home.wins += 1;
      away.losses += 1;
    } else if (g.away_score > g.home_score) {
      away.wins += 1;
      home.losses += 1;
    }
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl text-bsh-orange mb-2 tracking-wide">
        {league.name}
      </h1>
      <div className="flex gap-4 text-sm text-white/50 mb-10">
        <span className="text-bsh-gold font-semibold">Équipes</span>
        <Link href={`/${slug}/matchs`} className="hover:text-bsh-orange">
          Matchs
        </Link>
        <Link href={`/${slug}/classement`} className="hover:text-bsh-orange">
          Classement
        </Link>
      </div>

      <h2 className="font-display text-xl text-bsh-gold mb-4 tracking-wide">
        ÉQUIPES
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {teams?.map((team) => {
          const record = records.get(team.id);
          const hasGames = record && record.wins + record.losses > 0;
          return (
            <Link
              key={team.id}
              href={`/${slug}/equipe/${team.id}`}
              className="border border-white/10 rounded-lg p-6 hover:border-bsh-orange transition-colors bg-white/5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg">{team.name}</h3>
                {hasGames && (
                  <span className="text-xs font-semibold text-white/50 whitespace-nowrap ml-2">
                    {record!.wins}V-{record!.losses}D
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        {(!teams || teams.length === 0) && (
          <p className="text-white/50">Aucune équipe pour le moment.</p>
        )}
      </div>
    </div>
  );
}
