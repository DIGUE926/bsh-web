import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import PlayoffStatsForm from "./PlayoffStatsForm";

const ROUND_LABELS: Record<string, string> = {
  demi_finale_1: "Demi-finale 1",
  demi_finale_2: "Demi-finale 2",
  petite_finale: "Petite finale",
  finale: "Finale",
};

export const dynamic = "force-dynamic";

export default async function PlayoffMatchStatsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("playoff_games")
    .select(
      "*, team_home:team_home_id(id,name), team_away:team_away_id(id,name)"
    )
    .eq("id", gameId)
    .single();

  if (!game) notFound();

  const homeTeamId = game.team_home.id;
  const awayTeamId = game.team_away.id;

  const { data: homePlayers } = await supabase
    .from("players")
    .select("id, name, jersey_number")
    .eq("team_id", homeTeamId)
    .order("name");

  const { data: awayPlayers } = await supabase
    .from("players")
    .select("id, name, jersey_number")
    .eq("team_id", awayTeamId)
    .order("name");

  const { data: existingStats } = await supabase
    .from("playoff_player_stats")
    .select("*")
    .eq("playoff_game_id", gameId);

  return (
    <div>
      <h1 className="font-display text-xl text-bsh-orange mb-1 tracking-wide">
        {game.team_home.name} VS {game.team_away.name}
      </h1>
      <p className="text-white/50 mb-8">
        {game.game_date} · {ROUND_LABELS[game.round] ?? game.round} · Match{" "}
        {game.game_number}
      </p>

      <PlayoffStatsForm
        gameId={gameId}
        homeTeamName={game.team_home.name}
        awayTeamName={game.team_away.name}
        homePlayers={homePlayers ?? []}
        awayPlayers={awayPlayers ?? []}
        existingStats={existingStats ?? []}
        initialHomeScore={game.home_score}
        initialAwayScore={game.away_score}
      />
    </div>
  );
}
