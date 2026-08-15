import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import LiveControls from "./LiveControls";

export const dynamic = "force-dynamic";

export default async function LiveMatchPage({
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

  const homeTeam = game.home_team as unknown as { id: string; name: string };
  const awayTeam = game.away_team as unknown as { id: string; name: string };

  const { data: homePlayers } = await supabase
    .from("players")
    .select("id, name, jersey_number")
    .eq("team_id", homeTeam.id)
    .order("name");

  const { data: awayPlayers } = await supabase
    .from("players")
    .select("id, name, jersey_number")
    .eq("team_id", awayTeam.id)
    .order("name");

  const { data: events } = await supabase
    .from("game_events")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: true });

  const { data: existingStats } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("game_id", gameId);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-xl text-bsh-orange tracking-wide">
          {homeTeam.name} VS {awayTeam.name} — Live
        </h1>
        <Link
          href={`/admin/match/${gameId}`}
          className="text-sm text-bsh-gold hover:underline"
        >
          Corriger manuellement →
        </Link>
      </div>
      <p className="text-white/50 mb-6">{game.game_date}</p>

      <LiveControls
        gameId={gameId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homePlayers={homePlayers ?? []}
        awayPlayers={awayPlayers ?? []}
        initialHomeScore={game.home_score ?? 0}
        initialAwayScore={game.away_score ?? 0}
        initialStatus={game.status ?? "scheduled"}
        initialPeriod={game.current_period ?? 1}
        initialClock={game.clock_display ?? ""}
        initialShots={events ?? []}
        existingStats={existingStats ?? []}
      />
    </div>
  );
}
