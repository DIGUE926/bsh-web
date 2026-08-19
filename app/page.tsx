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

  // Leader (meilleur PIR) par ligue, pour le bandeau multi-ligues façon ESPN.
  const { data: rankingsForLeaders } = await supabase
    .from("global_rankings")
    .select("league_slug, player_id, player_name, team_name, pir")
    .order("pir", { ascending: false, nullsFirst: false });

  const leaderByLeagueSlug = new Map<
    string,
    { player_id: string; player_name: string; team_name: string | null; pir: number }
  >();
  for (const r of rankingsForLeaders ?? []) {
    if (!r.league_slug || leaderByLeagueSlug.has(r.league_slug)) continue;
    leaderByLeagueSlug.set(r.league_slug, r);
  }

  const { data: teamCounts } = await supabase.from("teams").select("league_id");
  const teamCountByLeagueId = new Map<string, number>();
  for (const t of teamCounts ?? []) {
    if (!t.league_id) continue;
    teamCountByLeagueId.set(t.league_id, (teamCountByLeagueId.get(t.league_id) ?? 0) + 1);
  }

  const { data: liveGames } = await supabase
    .from("games")
    .select(
      "id, home_score, away_score, home_team:home_team_id(name, logo_url), away_team:away_team_id(name, logo_url), league:league_id(slug)"
    )
    .eq("status", "live");

  const { data: livePlayoffGames } = await supabase
    .from("playoff_games")
    .select(
      "id, home_score, away_score, team_home:team_home_id(name, logo_url), team_away:team_away_id(name, logo_url), league:league_id(slug)"
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
      "*, home_team:team_home_id(name, logo_url), away_team:team_away_id(name, logo_url), league:league_id(slug)"
    )
    .eq("status", "completed")
    .order("game_date", { ascending: false })
    .limit(5);

  const { data: allPlayoffGames } = await supabase
    .from("playoff_games")
    .select(
      "*, home_team:team_home_id(name, logo_url), away_team:team_away_id(name, logo_url), league:league_id(slug)"
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

  type PlayoffGameWithLeague = {
    id: string;
    game_date: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team: { name: string; logo_url?: string | null } | null;
    away_team: { name: string; logo_url?: string | null } | null;
    league: { slug: string } | null;
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

  const playoffResults: ResultRow[] = (
    (recentPlayoffGames ?? []) as unknown as PlayoffGameWithLeague[]
  ).map((g) => ({
    id: g.id,
    game_date: g.game_date,
    home_score: g.home_score,
    away_score: g.away_score,
    home_team: g.home_team,
    away_team: g.away_team,
    href: `/${g.league?.slug}/playoffs/${g.id}`,
    tag: "Playoffs",
  }));

  const combinedResults = [...seasonResults, ...playoffResults]
    .sort((a, b) => b.game_date.localeCompare(a.game_date))
    .slice(0, 5);

  // Match du jour (fuseau Haïti) parmi les matchs playoffs
  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Port-au-Prince",
  });

  const playoffsList = (allPlayoffGames ?? []) as unknown as PlayoffGameWithLeague[];
  const matchDuJour = playoffsList.find((g) => g.game_date === todayStr);
  const nextPlayoffGame = playoffsList
    .filter((g) => g.status === "scheduled" && g.game_date >= todayStr)
    .sort((a, b) => a.game_date.localeCompare(b.game_date))[0];
  // Ligue mise en avant dans le bloc PLAYOFFS de la home (match du jour, sinon prochain match, sinon 1er de la liste)
  const featuredPlayoffSlug =
    matchDuJour?.league?.slug ?? nextPlayoffGame?.league?.slug ?? playoffsList[0]?.league?.slug ?? null;

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

      <section className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-sm text-white/40 tracking-widest">
            LES LIGUES
          </h2>
          <span className="text-[11px] text-white/30">
            {leagues?.length ?? 0} ligue{(leagues?.length ?? 0) > 1 ? "s" : ""}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {leagues?.map((league) => {
            const shortName = league.name.split(" - ")[0];
            const leader = leaderByLeagueSlug.get(league.slug);
            const teamCount = teamCountByLeagueId.get(league.id) ?? 0;
            const accent = league.primary_color ?? "#FF6B00";
            return (
              <Link
                key={league.id}
                href={`/${league.slug}`}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent hover:from-white/10 transition-colors"
              >
                <span
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ backgroundColor: accent }}
                />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar
                      name={league.name}
                      src={league.logo_url}
                      size={48}
                      rounded="rounded-lg"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display text-lg tracking-wide truncate group-hover:text-bsh-orange transition-colors">
                        {shortName}
                      </h3>
                      <p className="text-[11px] text-white/40 truncate">
                        {league.city ?? "Haïti"} · {teamCount} équipe{teamCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                    <span className="text-white/40 uppercase tracking-wide">
                      Leader PIR
                    </span>
                    {leader ? (
                      <span className="font-semibold text-bsh-gold truncate ml-2">
                        {leader.player_name}
                        <span className="text-white/40 font-normal">
                          {" "}
                          ({leader.team_name ?? "?"})
                        </span>{" "}
                        · {Number(leader.pir).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
          {(!leagues || leagues.length === 0) && (
            <p className="text-white/50">Aucune ligue trouvée pour le moment.</p>
          )}
        </div>
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
              league: { slug: string } | null;
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
                href={`/${g.league?.slug}/playoffs/${g.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {(matchDuJour || nextPlayoffGame || playoffsList.length > 0) && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 font-display text-sm text-bsh-gold tracking-wide">
              <span className="w-1 h-3.5 bg-bsh-orange rounded-sm" />
              PLAYOFFS
            </h2>
            <Link
              href={featuredPlayoffSlug ? `/${featuredPlayoffSlug}/playoffs` : "#"}
              className="text-xs text-bsh-orange hover:underline whitespace-nowrap"
            >
              Voir tous les matchs playoffs →
            </Link>
          </div>

          {matchDuJour ? (
            <Link
              href={`/${matchDuJour.league?.slug}/playoffs/${matchDuJour.id}`}
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
              href={`/${nextPlayoffGame.league?.slug}/playoffs/${nextPlayoffGame.id}`}
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
          <h2 className="flex items-center gap-2 font-display text-sm text-bsh-gold mb-2 tracking-wide">
            <span className="w-1 h-3.5 bg-bsh-orange rounded-sm" />
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
          <h2 className="flex items-center gap-2 font-display text-sm text-bsh-gold mb-2 tracking-wide">
            <span className="w-1 h-3.5 bg-bsh-orange rounded-sm" />
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

    </div>
  );
}
