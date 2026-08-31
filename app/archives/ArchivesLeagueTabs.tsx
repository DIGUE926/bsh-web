"use client";

import { useState } from "react";
import ArchivesSeasonPicker from "./ArchivesSeasonPicker";
import type {
  ArchiveGame,
  ArchivePlayerGameStat,
  ArchivePlayoffGame,
  ArchivePlayoffPlayerStat,
} from "./archiveStats";

export type LeagueArchiveBundle = {
  slug: string;
  name: string;
  teams: { id: string; name: string; head_coach: string | null }[];
  games: ArchiveGame[];
  playoffGames: ArchivePlayoffGame[];
  playerGameStats: ArchivePlayerGameStat[];
  playoffPlayerStats: ArchivePlayoffPlayerStat[];
  pastSeasons: string[];
};

export default function ArchivesLeagueTabs({
  bundles,
  defaultSlug,
}: {
  bundles: LeagueArchiveBundle[];
  defaultSlug?: string;
}) {
  const initial =
    bundles.find((b) => b.slug === defaultSlug)?.slug ?? bundles[0]?.slug ?? "";
  const [selected, setSelected] = useState<string>(initial);

  const current = bundles.find((b) => b.slug === selected);

  if (bundles.length === 0) {
    return <p className="text-white/50">Aucune ligue trouvée.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="text-xs text-white/40 uppercase tracking-wide">
          Ligue
        </span>
        {bundles.map((b) => (
          <button
            key={b.slug}
            onClick={() => setSelected(b.slug)}
            className={`text-sm px-3 py-1.5 rounded-full border font-semibold transition-colors ${
              b.slug === selected
                ? "border-bsh-orange text-bsh-orange bg-bsh-orange/10"
                : "border-white/10 text-white/50 hover:border-white/30"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {current ? (
        <ArchivesSeasonPicker
          slug={current.slug}
          teams={current.teams}
          games={current.games}
          playoffGames={current.playoffGames}
          playerGameStats={current.playerGameStats}
          playoffPlayerStats={current.playoffPlayerStats}
          pastSeasons={current.pastSeasons}
        />
      ) : (
        <p className="text-white/50">Aucune ligue sélectionnée.</p>
      )}
    </div>
  );
}
