import { supabase } from "@/lib/supabase";
import Link from "next/link";
import LiveBadge from "@/app/LiveBadge";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const { data: liveGames } = await supabase
    .from("games")
    .select(
      "id, home_score, away_score, home_team:home_team_id(name), away_team:away_team_id(name), league:league_id(slug)"
    )
    .eq("status", "live");

  const games = (liveGames ?? []) as unknown as Array<{
    id: string;
    home_score: number | null;
    away_score: number | null;
    home_team: { name: string } | null;
    away_team: { name: string } | null;
    league: { slug: string } | null;
  }>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-6">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <h1 className="font-display text-xl text-bsh-orange tracking-wide">
          MATCHS EN DIRECT
        </h1>
      </div>

      {games.length === 0 ? (
        <div className="border border-white/10 rounded-lg p-8 text-center bg-white/5">
          <p className="text-white/60 mb-3">Aucun match en direct actuellement.</p>
          <Link href="/" className="text-bsh-orange hover:underline text-sm">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((g) => (
            <LiveBadge
              key={g.id}
              gameId={g.id}
              homeTeamName={g.home_team?.name ?? "?"}
              awayTeamName={g.away_team?.name ?? "?"}
              initialHomeScore={g.home_score}
              initialAwayScore={g.away_score}
              href={`/${g.league?.slug}/match/${g.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
