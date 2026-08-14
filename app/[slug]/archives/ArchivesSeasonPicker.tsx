"use client";

import { useMemo, useState } from "react";
import GamesList, { type Game } from "@/app/[slug]/GamesList";
import { seasonLabel } from "@/lib/season";

export default function ArchivesSeasonPicker({
  slug,
  games,
  pastSeasons,
}: {
  slug: string;
  games: Game[];
  pastSeasons: string[];
}) {
  const [selectedSeason, setSelectedSeason] = useState<string>(
    pastSeasons[0] ?? ""
  );

  const filteredGames = useMemo(
    () => games.filter((g) => seasonLabel(g.game_date) === selectedSeason),
    [games, selectedSeason]
  );

  if (pastSeasons.length === 0) {
    return (
      <p className="text-white/50">
        Pas encore de saison passée archivée.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-white/40 uppercase tracking-wide">
          Saison
        </span>
        {pastSeasons.map((s) => (
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

      <GamesList
        slug={slug}
        games={filteredGames}
        emptyMessage={`Aucun match pour la saison ${selectedSeason}.`}
      />
    </div>
  );
}
