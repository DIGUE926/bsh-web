"use client";

import { useMemo, useState } from "react";
import GamesList from "@/app/[slug]/GamesList";
import { displaySeasonLabel } from "@/lib/season";
import ArchiveSeasonStats from "./ArchiveSeasonStats";
import type {
  ArchiveGame,
  ArchivePlayerGameStat,
  ArchivePlayoffGame,
  ArchivePlayoffPlayerStat,
} from "./archiveStats";

export default function ArchivesSeasonPicker({
  slug,
  teams,
  games,
  playoffGames,
  playerGameStats,
  playoffPlayerStats,
  pastSeasons,
}: {
  slug: string;
  teams: { id: string; name: string; head_coach: string | null }[];
  games: ArchiveGame[];
  playoffGames: ArchivePlayoffGame[];
  playerGameStats: ArchivePlayerGameStat[];
  playoffPlayerStats: ArchivePlayoffPlayerStat[];
  pastSeasons: string[];
}) {
  // Pas de saison présélectionnée -- Digue: "j'ai pas besoin d'avoir match
  // et stats generale alors que j'ai meme pas clique sur suble 2026", donc
  // les onglets Matchs/Stats générale ne s'affichent qu'après un clic
  // explicite sur une saison.
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [tab, setTab] = useState<"matchs" | "stats">("stats");

  const filteredGames = useMemo(
    () => games.filter((g) => displaySeasonLabel(slug, g.game_date) === selectedSeason),
    [games, slug, selectedSeason]
  );

  const filteredPlayoffGames = useMemo(
    () =>
      playoffGames.filter(
        (g) => displaySeasonLabel(slug, g.game_date) === selectedSeason
      ),
    [playoffGames, slug, selectedSeason]
  );

  const filteredPlayerGameStats = useMemo(() => {
    const ids = new Set(filteredGames.map((g) => g.id));
    return playerGameStats.filter((s) => ids.has(s.game_id));
  }, [playerGameStats, filteredGames]);

  const filteredPlayoffPlayerStats = useMemo(() => {
    const ids = new Set(filteredPlayoffGames.map((g) => g.id));
    return playoffPlayerStats.filter((s) => ids.has(s.playoff_game_id));
  }, [playoffPlayerStats, filteredPlayoffGames]);

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

      {selectedSeason && (
        <>
          <div className="flex gap-2 mb-6 text-sm font-semibold">
            <button
              onClick={() => setTab("matchs")}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                tab === "matchs"
                  ? "bg-bsh-orange text-black"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Matchs
            </button>
            <button
              onClick={() => setTab("stats")}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                tab === "stats"
                  ? "bg-bsh-orange text-black"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Stats générale
            </button>
          </div>

          {tab === "matchs" ? (
            <GamesList
              slug={slug}
              games={filteredGames}
              emptyMessage={`Aucun match pour la saison ${selectedSeason}.`}
            />
          ) : (
            <ArchiveSeasonStats
              slug={slug}
              seasonLabel={selectedSeason}
              teams={teams}
              games={filteredGames}
              playoffGames={filteredPlayoffGames}
              playerGameStats={filteredPlayerGameStats}
              playoffPlayerStats={filteredPlayoffPlayerStats}
            />
          )}
        </>
      )}
    </div>
  );
}
