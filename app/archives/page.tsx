import { supabase } from "@/lib/supabase";
import Breadcrumb from "@/app/Breadcrumb";
import { displaySeasonLabel, isCurrentSeasonGame } from "@/lib/season";
import ArchivesLeagueTabs, { type LeagueArchiveBundle } from "./ArchivesLeagueTabs";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Archives — Saisons passées | BSH Basketball Haïti",
  description:
    "Les saisons passées de toutes les ligues BSH : matchs, classement final et leaders, saison régulière et playoffs.",
};

async function buildLeagueBundle(
  league: { id: string; slug: string; name: string }
): Promise<LeagueArchiveBundle> {
  const { data: games } = await supabase
    .from("games")
    .select("*, home_team:home_team_id(name), away_team:away_team_id(name)")
    .eq("league_id", league.id)
    .order("game_date", { ascending: false });

  const { data: playoffGames } = await supabase
    .from("playoff_games")
    .select("*, home_team:team_home_id(name), away_team:team_away_id(name)")
    .eq("league_id", league.id)
    .order("game_date", { ascending: false });

  const allGames = games ?? [];
  const allPlayoffGames = playoffGames ?? [];

  const gameIds = allGames.map((g) => g.id);
  const playoffGameIds = allPlayoffGames.map((g) => g.id);

  const { data: playerGameStats } = gameIds.length
    ? await supabase
        .from("player_game_stats")
        .select("*, player:player_id(name, position, team:team_id(name))")
        .in("game_id", gameIds)
    : { data: [] };

  const { data: playoffPlayerStats } = playoffGameIds.length
    ? await supabase
        .from("playoff_player_stats")
        .select("*, player:player_id(name, position, team:team_id(name))")
        .eq("league_id", league.id)
    : { data: [] };

  const pastSeasons = Array.from(
    new Set(
      allGames
        .filter((g) => !isCurrentSeasonGame(league.slug, g.game_date))
        .map((g) => displaySeasonLabel(league.slug, g.game_date))
    )
  )
    .sort()
    .reverse();

  return {
    slug: league.slug,
    name: league.name,
    games: allGames,
    playoffGames: allPlayoffGames,
    playerGameStats: playerGameStats ?? [],
    playoffPlayerStats: playoffPlayerStats ?? [],
    pastSeasons,
  };
}

export default async function ArchivesPage({
  searchParams,
}: {
  searchParams: Promise<{ ligue?: string }>;
}) {
  const { ligue } = await searchParams;

  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, slug, name")
    .order("name", { ascending: true });

  const bundles = await Promise.all(
    (leagues ?? []).map((l) => buildLeagueBundle(l))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb items={[{ label: "Archives" }]} />
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        Archives
      </h1>
      <p className="text-white/50 mb-6">
        Les saisons passées, toutes ligues — classement final, leaders et
        matchs, saison régulière et playoffs.
      </p>

      <ArchivesLeagueTabs bundles={bundles} defaultSlug={ligue} />
    </div>
  );
}
