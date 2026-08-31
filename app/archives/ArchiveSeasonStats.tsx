"use client";

import { useMemo } from "react";
import RankingsTable from "@/app/[slug]/classement-joueurs/RankingsTable";
import {
  computeCoachStandings,
  computeCombinedLeaders,
  computeCombinedStandings,
  type ArchiveGame,
  type ArchivePlayerGameStat,
  type ArchivePlayoffGame,
  type ArchivePlayoffPlayerStat,
} from "./archiveStats";

export default function ArchiveSeasonStats({
  slug,
  seasonLabel,
  teams,
  games,
  playoffGames,
  playerGameStats,
  playoffPlayerStats,
}: {
  slug: string;
  seasonLabel: string;
  teams: { id: string; name: string; head_coach: string | null }[];
  games: ArchiveGame[];
  playoffGames: ArchivePlayoffGame[];
  playerGameStats: ArchivePlayerGameStat[];
  playoffPlayerStats: ArchivePlayoffPlayerStat[];
}) {
  const standings = useMemo(
    () => computeCombinedStandings(games, playoffGames),
    [games, playoffGames]
  );

  const coachStandings = useMemo(
    () => computeCoachStandings(standings, teams),
    [standings, teams]
  );

  const leaders = useMemo(
    () =>
      computeCombinedLeaders(playerGameStats, playoffPlayerStats).map((row) => ({
        ...row,
        league_slug: slug,
      })),
    [playerGameStats, playoffPlayerStats, slug]
  );

  const hasPlayoffs = playoffGames.length > 0;

  if (standings.length === 0 && leaders.length === 0) {
    return (
      <p className="text-white/50">
        Pas encore de stats pour la saison {seasonLabel}.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-display text-lg text-bsh-orange mb-1 tracking-wide">
          Classement final
        </h2>
        <p className="text-xs text-white/40 mb-4">
          {hasPlayoffs
            ? "Saison régulière et playoffs combinés."
            : "Saison régulière."}
        </p>
        {standings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/20 text-white/50 uppercase">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Équipe</th>
                  <th className="py-2 px-2 text-center">V</th>
                  <th className="py-2 px-2 text-center">D</th>
                  <th className="py-2 px-2 text-center">Marqués</th>
                  <th className="py-2 px-2 text-center">Encaissés</th>
                  <th className="py-2 px-2 text-center text-bsh-orange">Diff</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.teamId} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-bsh-gold font-display">{i + 1}</td>
                    <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                      {s.teamName}
                    </td>
                    <td className="py-3 px-2 text-center text-white/60">{s.wins}</td>
                    <td className="py-3 px-2 text-center text-white/60">{s.losses}</td>
                    <td className="py-3 px-2 text-center text-white/60">
                      {s.pointsFor}
                    </td>
                    <td className="py-3 px-2 text-center text-white/60">
                      {s.pointsAgainst}
                    </td>
                    <td className="py-3 px-2 text-center text-bsh-orange font-bold">
                      {s.pointsFor - s.pointsAgainst >= 0 ? "+" : ""}
                      {s.pointsFor - s.pointsAgainst}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-white/50">Pas de match terminé pour cette saison.</p>
        )}
      </div>

      {coachStandings.length > 0 && (
        <div>
          <h2 className="font-display text-lg text-bsh-orange mb-1 tracking-wide">
            Classement des coachs
          </h2>
          <p className="text-xs text-white/40 mb-4">
            Bilan V-D de l&apos;équipe de chaque coach, saison et playoffs combinés.
            {teams.length > coachStandings.length &&
              " Une équipe sans coach renseigné n'apparaît pas ici."}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/20 text-white/50 uppercase">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Coach</th>
                  <th className="py-2 pr-4">Équipe</th>
                  <th className="py-2 px-2 text-center">V</th>
                  <th className="py-2 px-2 text-center">D</th>
                  <th className="py-2 px-2 text-center text-bsh-orange">Diff</th>
                </tr>
              </thead>
              <tbody>
                {coachStandings.map((c, i) => (
                  <tr key={c.coachName} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-bsh-gold font-display">{i + 1}</td>
                    <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                      {c.coachName}
                    </td>
                    <td className="py-3 pr-4 text-white/60 whitespace-nowrap">
                      {c.teamNames.join(", ")}
                    </td>
                    <td className="py-3 px-2 text-center text-white/60">{c.wins}</td>
                    <td className="py-3 px-2 text-center text-white/60">{c.losses}</td>
                    <td className="py-3 px-2 text-center text-bsh-orange font-bold">
                      {c.pointsFor - c.pointsAgainst >= 0 ? "+" : ""}
                      {c.pointsFor - c.pointsAgainst}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-lg text-bsh-orange mb-1 tracking-wide">
          Leaders de la saison
        </h2>
        <p className="text-xs text-white/40 mb-4">
          {hasPlayoffs
            ? "Moyennes saison régulière et playoffs combinées."
            : "Moyennes saison régulière."}
        </p>
        <RankingsTable
          rankings={leaders}
          columns={[
            { key: "ppg", label: "PPG" },
            { key: "rpg", label: "RPG" },
            { key: "apg", label: "APG" },
            { key: "spg", label: "SPG" },
            { key: "bpg", label: "BPG" },
            { key: "pir", label: "Score", highlight: true },
          ]}
        />
      </div>
    </div>
  );
}
