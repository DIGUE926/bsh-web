import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import StatsForm from "./StatsForm";

export const dynamic = "force-dynamic";

export default async function MatchStatsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("*, home_team:home_team_id(id,name), away_team:away_team_id(id,name)")
    .eq("id", gameId)
    .single();

  if (!game) notFound();

  const homeTeamId = game.home_team.id;
  const awayTeamId = game.away_team.id;

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
    .from("player_game_stats")
    .select("*")
    .eq("game_id", gameId);

  return (
    <div>
      <h1 className="font-display text-3xl text-bsh-orange mb-2 tracking-wide">
        {game.home_team.name} VS {game.away_team.name}
      </h1>
      <p className="text-white/50 mb-8">{game.game_date}</p>

      <StatsForm
        gameId={gameId}
        homeTeamName={game.home_team.name}
        awayTeamName={game.away_team.name}
        homePlayers={homePlayers ?? []}
        awayPlayers={awayPlayers ?? []}
        existingStats={existingStats ?? []}
        initialHomeScore={game.home_score}
        initialAwayScore={game.away_score}
      />
    </div>
  );
}
