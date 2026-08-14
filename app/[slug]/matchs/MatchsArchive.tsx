"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Game = {
  id: string;
  game_date: string;
  phase: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

// Une saison basket va généralement de juillet à juin.
// Ex: un match en janvier 2026 appartient à la saison "2025-2026".
function seasonLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export default function MatchsArchive({
  slug,
  games,
}: {
  slug: string;
  games: Game[];
}) {
  const seasons = useMemo(() => {
    const set = new Set(games.map((g) => seasonLabel(g.game_date)));
    return Array.from(set).sort().reverse();
  }, [games]);

  const [selectedSeason, setSelectedSeason] = useState<string>(
    seasons[0] ?? ""
  );

  const filteredGames = useMemo(
    () => games.filter((g) => seasonLabel(g.game_date) === selectedSeason),
    [games, selectedSeason]
  );

  if (games.length === 0) {
    return <p className="text-white/50">Aucun match pour le moment.</p>;
  }

  return (
    <div>
      {seasons.length > 1 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-white/40 uppercase tracking-wide">
            Saison
          </span>
          {seasons.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSeason(s)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                s === selectedSeason
                  ? "border-bsh-orange text-bsh-orange bg-bsh-orange/10"
                  : "border-white/10 text-white/50 hover:border-white/30"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filteredGames.map((game) => (
          <Link
            key={game.id}
            href={`/${slug}/match/${game.id}`}
            className="block border border-white/10 rounded-lg p-4 hover:border-bsh-orange transition-colors bg-white/5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {game.home_team?.name ?? "?"} vs{" "}
                  {game.away_team?.name ?? "?"}
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
        {filteredGames.length === 0 && (
          <p className="text-white/50">
            Aucun match pour la saison {selectedSeason}.
          </p>
        )}
      </div>
    </div>
  );
}
