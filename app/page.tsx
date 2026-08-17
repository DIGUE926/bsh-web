import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Avatar from "@/app/Avatar";
import LiveBadge from "@/app/LiveBadge";
import { shortTeamName } from "@/lib/teamDisplay";

export const revalidate = 60;

export default async function Home() {
  const { data: leagues } = await supabase
    .from("leagues")
    .select("*")
    .order("name");

  const { data: liveGames } = await supabase
    .from("games")
    .select(
      "id, home_score, away_score, home_team:home_team_id(name, logo_url), away_team:away_team_id(name, logo_url), league:league_id(slug)"
    )
    .eq("status", "live");

  const { data: livePlayoffGames } = await supabase
    .from("playoff_games")
    .select(
      "id, home_score, away_score, team_home:team_home_id(name, logo_url), team_away:team_away_id(name, logo_url)"
    )
    .eq("status", "live");

  const { data: recentGames } = await supabase
    .from("games")
    .select(
      "*, home_team:home_team_id(name, logo_url), away_team:away_team_id(name, logo_url), league:league_id(slug)"
    )
    .eq("status", "completed")
    .order("game_date", { ascending: false })
    .limit(5);

  const { data: upcomingGames } = await supabase
    .from("games")
    .select(
      "*, home_team:home_team_id(name, logo_url), away_team:away_team_id(name, logo_url), league:league_id(slug)"
    )
    .eq("status", "scheduled")
    .order("game_date", { ascending: true })
    .limit(5);

  const { data: recentPlayoffGames } = await supabase
    .from("playoff_games")
    .select(
      "*, home_team:team_home_id(name, logo_url), away_team:team_away_id(name, logo_url)"
    )
    .eq("status", "completed")
    .order("game_date", { ascending: false })
    .limit(5);

  const { data: allPlayoffGames } = await supabase
    .from("playoff_games")
    .select(
      "*, home_team:team_home_id(name, logo_url), away_team:team_away_id(name, logo_url)"
    )
    .order("game_date", { ascending: true });

  // Combine saison + playoffs, tag each, trier par date desc, garder les 5 plus récents
  type ResultRow = {
    id: string;
    game_date: string;
    home_score: number | null;
    away_score: number | null;
    home_team: { name: string; logo_url?: string | null } | null;
    away_team: { name: string; logo_url?: string | null } | null;
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
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 sm:py-10">
      <section className="text-center mb-4 sm:mb-6">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-bsh-orange mb-1.5 sm:mb-2 tracking-wide">
          BSH
        </h1>
        <p className="text-white/60 text-xs sm:text-sm max-w-xl mx-auto">
          La plateforme officielle de statistiques basketball multi-ligues
          en Haïti.
        </p>
      </section>

      {((liveGames && liveGames.length > 0) || (livePlayoffGames && livePlayoffGames.length > 0)) && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="font-display text-sm text-red-400 tracking-wide">
              EN DIRECT
            </h2>
          </div>
          <div className="space-y-2">
            {(liveGames as unknown as Array<{
              id: string;
              home_score: number | null;
              away_score: number | null;
              home_team: { name: string; logo_url?: string | null } | null;
              away_team: { name: string; logo_url?: string | null } | null;
              league: { slug: string } | null;
            }> ?? []).map((g) => (
              <LiveBadge
                key={g.id}
                gameId={g.id}
                homeTeamName={g.home_team?.name ?? "?"}
                awayTeamName={g.away_team?.name ?? "?"}
                homeTeamLogo={g.home_team?.logo_url}
                awayTeamLogo={g.away_team?.logo_url}
                initialHomeScore={g.home_score}
                initialAwayScore={g.away_score}
                href={`/${g.league?.slug}/match/${g.id}`}
              />
            ))}
            {(livePlayoffGames as unknown as Array<{
              id: string;
              home_score: number | null;
              away_score: number | null;
              team_home: { name: string; logo_url?: string | null } | null;
              team_away: { name: string; logo_url?: string | null } | null;
            }> ?? []).map((g) => (
              <LiveBadge
                key={g.id}
                gameType="playoff"
                gameId={g.id}
                homeTeamName={g.team_home?.name ?? "?"}
                awayTeamName={g.team_away?.name ?? "?"}
                homeTeamLogo={g.team_home?.logo_url}
                awayTeamLogo={g.team_away?.logo_url}
                initialHomeScore={g.home_score}
                initialAwayScore={g.away_score}
                href={`/playoffs/${g.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {(matchDuJour || nextPlayoffGame || playoffsList.length > 0) && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-sm text-bsh-gold tracking-wide">
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
                Match du jour
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Avatar name={matchDuJour.home_team?.name ?? "?"} src={matchDuJour.home_team?.logo_url} size={22} rounded="rounded" />
                  <p className="font-semibold text-xs sm:text-sm truncate">
                    <span className="sm:hidden">{shortTeamName(matchDuJour.home_team?.name ?? "?")}</span>
                    <span className="hidden sm:inline">{matchDuJour.home_team?.name ?? "?"}</span>
                    {" vs "}
                    <span className="sm:hidden">{shortTeamName(matchDuJour.away_team?.name ?? "?")}</span>
                    <span className="hidden sm:inline">{matchDuJour.away_team?.name ?? "?"}</span>
                  </p>
                  <Avatar name={matchDuJour.away_team?.name ?? "?"} src={matchDuJour.away_team?.logo_url} size={22} rounded="rounded" />
                </div>
                {matchDuJour.status === "completed" ? (
                  <p className="font-display text-sm text-bsh-gold shrink-0">
                    {matchDuJour.home_score} - {matchDuJour.away_score}
                  </p>
                ) : (
                  <p className="text-xs text-white/50 shrink-0">
                    {matchDuJour.game_date}
                  </p>
                )}
              </div>
            </Link>
          ) : nextPlayoffGame ? (
            <Link
              href={`/playoffs/${nextPlayoffGame.id}`}
              className="block border border-white/10 rounded-lg p-3 hover:border-bsh-orange transition-colors bg-white/5"
            >
              <p className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-1">
                Prochain match playoff
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <Avatar name={nextPlayoffGame.home_team?.name ?? "?"} src={nextPlayoffGame.home_team?.logo_url} size={22} rounded="rounded" />
                  <p className="font-semibold text-xs sm:text-sm truncate">
                    <span className="sm:hidden">{shortTeamName(nextPlayoffGame.home_team?.name ?? "?")}</span>
                    <span className="hidden sm:inline">{nextPlayoffGame.home_team?.name ?? "?"}</span>
                    {" vs "}
                    <span className="sm:hidden">{shortTeamName(nextPlayoffGame.away_team?.name ?? "?")}</span>
                    <span className="hidden sm:inline">{nextPlayoffGame.away_team?.name ?? "?"}</span>
                  </p>
                  <Avatar name={nextPlayoffGame.away_team?.name ?? "?"} src={nextPlayoffGame.away_team?.logo_url} size={22} rounded="rounded" />
                </div>
                <p className="text-xs text-white/40 shrink-0">
                  {nextPlayoffGame.game_date}
                </p>
              </div>
            </Link>
          ) : null}
        </section>
      )}

      {combinedResults.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-sm text-bsh-gold mb-2 tracking-wide">
            DERNIERS RÉSULTATS
          </h2>
          <div className="space-y-2">
            {combinedResults.map((game) => (
              <Link
                key={game.id}
                href={game.href}
                className="block border border-white/10 rounded-lg p-2.5 hover:border-bsh-orange transition-colors bg-white/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Avatar name={game.home_team?.name ?? "?"} src={game.home_team?.logo_url} size={20} rounded="rounded" />
                    <p className="font-semibold text-xs sm:text-sm truncate">
                      <span className="sm:hidden">{shortTeamName(game.home_team?.name ?? "?")}</span>
                      <span className="hidden sm:inline">{game.home_team?.name ?? "?"}</span>
                      {" vs "}
                      <span className="sm:hidden">{shortTeamName(game.away_team?.name ?? "?")}</span>
                      <span className="hidden sm:inline">{game.away_team?.name ?? "?"}</span>
                    </p>
                    <Avatar name={game.away_team?.name ?? "?"} src={game.away_team?.logo_url} size={20} rounded="rounded" />
                    <span
                      className={`shrink-0 text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        game.tag === "Playoffs"
                          ? "bg-bsh-orange/20 text-bsh-orange"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {game.tag}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <p className="font-display text-sm text-bsh-gold">
                      {game.home_score} - {game.away_score}
                    </p>
                    <p className="hidden sm:block text-[11px] text-white/40">{game.game_date}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {upcomingGames && upcomingGames.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-sm text-bsh-gold mb-2 tracking-wide">
            À VENIR
          </h2>
          <div className="space-y-2">
            {upcomingGames.map((game) => (
              <Link
                key={game.id}
                href={`/${game.league?.slug}/match/${game.id}`}
                className="block border border-white/10 rounded-lg p-2.5 hover:border-bsh-orange transition-colors bg-white/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Avatar name={game.home_team?.name ?? "?"} src={game.home_team?.logo_url} size={20} rounded="rounded" />
                    <p className="font-semibold text-xs sm:text-sm truncate">
                      <span className="sm:hidden">{shortTeamName(game.home_team?.name ?? "?")}</span>
                      <span className="hidden sm:inline">{game.home_team?.name ?? "?"}</span>
                      {" vs "}
                      <span className="sm:hidden">{shortTeamName(game.away_team?.name ?? "?")}</span>
                      <span className="hidden sm:inline">{game.away_team?.name ?? "?"}</span>
                    </p>
                    <Avatar name={game.away_team?.name ?? "?"} src={game.away_team?.logo_url} size={20} rounded="rounded" />
                  </div>
                  <p className="text-[11px] text-white/40 shrink-0">{game.game_date}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-sm text-bsh-gold mb-2 tracking-wide">
          LIGUES
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {leagues?.map((league) => (
            <Link
              key={league.id}
              href={`/${league.slug}`}
              className="flex items-center gap-3 border border-white/10 rounded-lg p-3 hover:border-bsh-orange transition-colors bg-white/5"
            >
              <Avatar
                name={league.name}
                src={league.logo_url}
                size={44}
                rounded="rounded-lg"
              />
              <h3 className="font-display text-sm truncate">{league.name}</h3>
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
