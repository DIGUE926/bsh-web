import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const revalidate = 60;

export default async function Home() {
  const { data: leagues } = await supabase
    .from("leagues")
    .select("*")
    .order("name");

  const { data: recentGames } = await supabase
    .from("games")
    .select(
      "*, home_team:home_team_id(name), away_team:away_team_id(name), league:league_id(slug)"
    )
    .eq("status", "completed")
    .order("game_date", { ascending: false })
    .limit(5);

  const { data: upcomingGames } = await supabase
    .from("games")
    .select(
      "*, home_team:home_team_id(name), away_team:away_team_id(name), league:league_id(slug)"
    )
    .eq("status", "scheduled")
    .order("game_date", { ascending: true })
    .limit(5);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <section className="text-center mb-16">
        <h1 className="font-display text-5xl md:text-6xl text-bsh-orange mb-4 tracking-wide">
          BSH
        </h1>
        <p className="text-white/70 text-lg max-w-xl mx-auto">
          La plateforme officielle de statistiques basketball multi-ligues
          en Haïti.
        </p>
      </section>

      {recentGames && recentGames.length > 0 && (
        <section className="mb-16">
          <h2 className="font-display text-2xl text-bsh-gold mb-6 tracking-wide">
            DERNIERS RÉSULTATS
          </h2>
          <div className="space-y-3">
            {recentGames.map((game) => (
              <Link
                key={game.id}
                href={`/${
                  game.league?.slug
                }/match/${game.id}`}
                className="block border border-white/10 rounded-lg p-4 hover:border-bsh-orange transition-colors bg-white/5"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {game.home_team?.name ?? "?"} vs{" "}
                    {game.away_team?.name ?? "?"}
                  </p>
                  <div className="flex items-center gap-4">
                    <p className="font-display text-lg text-bsh-gold">
                      {game.home_score} - {game.away_score}
                    </p>
                    <p className="text-xs text-white/40">{game.game_date}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {upcomingGames && upcomingGames.length > 0 && (
        <section className="mb-16">
          <h2 className="font-display text-2xl text-bsh-gold mb-6 tracking-wide">
            À VENIR
          </h2>
          <div className="space-y-3">
            {upcomingGames.map((game) => (
              <Link
                key={game.id}
                href={`/${game.league?.slug}/match/${game.id}`}
                className="block border border-white/10 rounded-lg p-4 hover:border-bsh-orange transition-colors bg-white/5"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {game.home_team?.name ?? "?"} vs{" "}
                    {game.away_team?.name ?? "?"}
                  </p>
                  <p className="text-xs text-white/40">{game.game_date}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-2xl text-bsh-gold mb-6 tracking-wide">
          LIGUES
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {leagues?.map((league) => (
            <Link
              key={league.id}
              href={`/${league.slug}`}
              className="border border-white/10 rounded-lg p-6 hover:border-bsh-orange transition-colors bg-white/5"
            >
              <h3 className="font-display text-xl">{league.name}</h3>
            </Link>
          ))}
          {(!leagues || leagues.length === 0) && (
            <p className="text-white/50">Aucune ligue trouvée pour le moment.</p>
          )}
        </div>
      </section>
    </div>
  );
}
