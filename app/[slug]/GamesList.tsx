import Link from "next/link";

export type Game = {
  id: string;
  game_date: string;
  phase: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

export default function GamesList({
  slug,
  games,
  emptyMessage,
}: {
  slug: string;
  games: Game[];
  emptyMessage: string;
}) {
  if (games.length === 0) {
    return <p className="text-white/50">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <Link
          key={game.id}
          href={`/${slug}/match/${game.id}`}
          className="block border border-white/10 rounded-lg p-4 hover:border-bsh-orange transition-colors bg-white/5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                {game.home_team?.name ?? "?"} vs {game.away_team?.name ?? "?"}
              </p>
              <p className="text-sm text-white/50">
                {game.game_date} · {game.phase ?? "Saison régulière"}
              </p>
            </div>
            <div className="text-right">
              {game.status === "completed" ? (
                <p className="font-display text-lg text-bsh-gold">
                  {game.home_score} - {game.away_score}
                </p>
              ) : (
                <p className="text-xs text-white/40 uppercase">À venir</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
