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

  const { data: recentPlayoffGames } = await supabase
    .from("playoff_games")
    .select(
      "*, home_team:team_home_id(name), away_team:team_away_id(name)"
    )
    .eq("status", "completed")
    .order("game_date", { ascending: false })
    .limit(5);

  const { data: allPlayoffGames } = await supabase
    .from("playoff_games")
    .select(
      "*, home_team:team_home_id(name), away_team:team_away_id(name)"
    )
    .order("game_date", { ascending: true });

  // Combine saison + playoffs, tag each, trier par date desc, garder les 5 plus récents
  type ResultRow = {
    id: string;
    game_date: string;
    home_score: number | null;
    away_score: number | null;
    home_team: { name: string } | null;
    away_team: { name: string } | null;
    href: string;
    tag: "Saison" | "Playoffs";
  };

  const seasonResults: ResultRow[] = (recentGames ?? []).map((g) => ({
    id: g.id,
    game_date: g.game_date,
    home_score: g.home_score,
    away_score: g.away_score,
    home_team: g.home_team,
    away_team: g.away_team,
    href: `/${g.league?.slug}/match/${g.id}`,
    tag: "Saison",
  }));

  const playoffResults: ResultRow[] = (recentPlayoffGames ?? []).map((g) => ({
    id: g.id,
    game_date: g.game_date,
    home_score: g.home_score,
    away_score: g.away_score,
    home_team: g.home_team,
    away_team: g.away_team,
    href: `/playoffs/${g.id}`,
    tag: "Playoffs",
  }));

  const combinedResults = [...seasonResults, ...playoffResults]
    .sort((a, b) => b.game_date.localeCompare(a.game_date))
    .slice(0, 5);

  // Match du jour (fuseau Haïti) parmi les matchs playoffs
  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Port-au-Prince",
  });

  const playoffsList = allPlayoffGames ?? [];
  const matchDuJour = playoffsList.find((g) => g.game_date === todayStr);
  const nextPlayoffGame = playoffsList
    .filter((g) => g.status === "scheduled" && g.game_date >= todayStr)
    .sort((a, b) => a.game_date.localeCompare(b.game_date))[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="text-center mb-10">
        <h1 className="font-display text-3xl md:text-4xl text-bsh-orange mb-2 tracking-wide">
          BSH
        </h1>
        <p className="text-white/60 text-sm max-w-xl mx-auto">
          La plateforme officielle de statistiques basketball multi-ligues
          en Haïti.
        </p>
      </section>

      {(matchDuJour || nextPlayoffGame || playoffsList.length > 0) && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base text-bsh-gold tracking-wide">
              PLAYOFFS
            </h2>
            <Link
              href="/playoffs"
              className="text-xs text-bsh-orange hover:underline whitespace-nowrap"
            >
              Voir tous les matchs playoffs →
            </Link>
          </div>

          {matchDuJour ? (
            <Link
              href={`/playoffs/${matchDuJour.id}`}
              className="block border border-bsh-orange bg-bsh-orange/10 rounded-lg p-4 hover:opacity-90 transition-opacity"
            >
              <p className="text-xs text-bsh-orange uppercase tracking-wide font-semibold mb-1">
                🏀 Match du jour
              </p>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">
                  {matchDuJour.home_team?.name ?? "?"} vs{" "}
                  {matchDuJour.away_team?.name ?? "?"}
                </p>
                {matchDuJour.status === "completed" ? (
                  <p className="font-display text-base text-bsh-gold">
                    {matchDuJour.home_score} - {matchDuJour.away_score}
                  </p>
                ) : (
                  <p className="text-xs text-white/50">
                    {matchDuJour.game_date}
                  </p>
                )}
              </div>
            </Link>
          ) : nextPlayoffGame ? (
            <Link
              href={`/playoffs/${nextPlayoffGame.id}`}
              className="block border border-white/10 rounded-lg p-4 hover:border-bsh-orange transition-colors bg-white/5"
            >
              <p className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-1">
                Prochain match playoff
              </p>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">
                  {nextPlayoffGame.home_team?.name ?? "?"} vs{" "}
                  {nextPlayoffGame.away_team?.name ?? "?"}
                </p>
                <p className="text-xs text-white/40">
                  {nextPlayoffGame.game_date}
                </p>
              </div>
            </Link>
          ) : null}
        </section>
      )}

      {combinedResults.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-base text-bsh-gold mb-3 tracking-wide">
            DERNIERS RÉSULTATS
          </h2>
          <div className="space-y-2">
            {combinedResults.map((game) => (
              <Link
                key={game.id}
                href={game.href}
                className="block border border-white/10 rounded-lg p-3 hover:border-bsh-orange transition-colors bg-white/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">
                      {game.home_team?.name ?? "?"} vs{" "}
                      {game.away_team?.name ?? "?"}
                    </p>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        game.tag === "Playoffs"
                          ? "bg-bsh-orange/20 text-bsh-orange"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {game.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-display text-base text-bsh-gold">
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
        <section className="mb-10">
          <h2 className="font-display text-base text-bsh-gold mb-3 tracking-wide">
            À VENIR
          </h2>
          <div className="space-y-2">
            {upcomingGames.map((game) => (
              <Link
                key={game.id}
                href={`/${game.league?.slug}/match/${game.id}`}
                className="block border border-white/10 rounded-lg p-3 hover:border-bsh-orange transition-colors bg-white/5"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">
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
        <h2 className="font-display text-base text-bsh-gold mb-3 tracking-wide">
          LIGUES
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {leagues?.map((league) => (
            <Link
              key={league.id}
              href={`/${league.slug}`}
              className="border border-white/10 rounded-lg p-4 hover:border-bsh-orange transition-colors bg-white/5"
            >
              <h3 className="font-display text-base">{league.name}</h3>
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
