import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Breadcrumb from "@/app/Breadcrumb";

export const revalidate = 60;

type StandingRow = {
  team_id: string;
  team_name: string;
  games_played: number;
  wins: number;
  losses: number;
  win_pct: number;
  points_for: number;
  points_against: number;
  point_diff: number;
};

type PlayoffGame = {
  team_home_id: string;
  team_away_id: string;
  home_score: number | null;
  away_score: number | null;
  game_date: string;
  status: string;
};

function computeStreaks(
  games: PlayoffGame[],
  teamIds: string[]
): Record<string, { label: string; positive: boolean }> {
  const streaks: Record<string, { label: string; positive: boolean }> = {};

  for (const teamId of teamIds) {
    const teamGames = games
      .filter(
        (g) =>
          g.status === "completed" &&
          g.home_score != null &&
          g.away_score != null &&
          (g.team_home_id === teamId || g.team_away_id === teamId)
      )
      .sort((a, b) => a.game_date.localeCompare(b.game_date))
      .reverse(); // plus récent en premier

    if (teamGames.length === 0) {
      streaks[teamId] = { label: "—", positive: true };
      continue;
    }

    let count = 0;
    let streakIsWin: boolean | null = null;

    for (const g of teamGames) {
      const isHome = g.team_home_id === teamId;
      const won = isHome
        ? g.home_score! > g.away_score!
        : g.away_score! > g.home_score!;

      if (streakIsWin === null) {
        streakIsWin = won;
        count = 1;
      } else if (won === streakIsWin) {
        count++;
      } else {
        break;
      }
    }

    streaks[teamId] = {
      label: `${count}${streakIsWin ? "V" : "D"}`,
      positive: !!streakIsWin,
    };
  }

  return streaks;
}

export default async function PlayoffTeamStandingsPage() {
  const { data: standings } = await supabase
    .from("playoff_team_standings")
    .select("*");

  const { data: games } = await supabase
    .from("playoff_games")
    .select("team_home_id, team_away_id, home_score, away_score, game_date, status");

  const rows = (standings ?? []) as unknown as StandingRow[];
  const allGames = (games ?? []) as unknown as PlayoffGame[];

  const sorted = [...rows].sort((a, b) => {
    if (b.win_pct !== a.win_pct) return b.win_pct - a.win_pct;
    if (b.point_diff !== a.point_diff) return b.point_diff - a.point_diff;
    return b.points_for - a.points_for;
  });

  const streaks = computeStreaks(
    allGames,
    sorted.map((r) => r.team_id)
  );

  const leader = sorted[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[{ label: "Playoffs", href: "/playoffs" }, { label: "Équipes" }]}
      />
      <h1 className="font-display text-2xl text-bsh-orange mb-1 tracking-wide">
        CLASSEMENT ÉQUIPES PLAYOFFS
      </h1>
      <p className="text-white/50 mb-6">
        Bilan, différentiel de points et série en cours
      </p>

      <div className="flex gap-2 mb-8 overflow-x-auto text-sm font-semibold">
        <Link
          href="/playoffs"
          className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 whitespace-nowrap transition-colors"
        >
          Bracket
        </Link>
        <span className="px-4 py-2 rounded-lg bg-bsh-orange text-black whitespace-nowrap">
          Équipes
        </span>
        <Link
          href="/playoffs/classement"
          className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 whitespace-nowrap transition-colors"
        >
          Leaders playoffs
        </Link>
      </div>

      {leader && (
        <div className="border border-bsh-gold/40 bg-bsh-gold/5 rounded-lg p-4 mb-8 flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-xs text-bsh-gold uppercase tracking-wide font-semibold">
              Meilleur bilan playoffs
            </p>
            <p className="font-display text-lg">{leader.team_name}</p>
            <p className="text-sm text-white/60">
              {leader.wins}V - {leader.losses}D ·{" "}
              {(leader.win_pct * 100).toFixed(0)}% · Diff{" "}
              {leader.point_diff >= 0 ? "+" : ""}
              {leader.point_diff}
            </p>
          </div>
        </div>
      )}

      {sorted.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/20 text-white/50 uppercase">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Équipe</th>
                <th className="py-2 px-2 text-center">MJ</th>
                <th className="py-2 px-2 text-center">V</th>
                <th className="py-2 px-2 text-center">D</th>
                <th className="py-2 px-2 text-center">PCT</th>
                <th className="py-2 px-2 text-center">PP</th>
                <th className="py-2 px-2 text-center">PC</th>
                <th className="py-2 px-2 text-center">DIFF</th>
                <th className="py-2 px-2 text-center">Série</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const streak = streaks[r.team_id];
                return (
                  <tr
                    key={r.team_id}
                    className={`border-b border-white/5 ${
                      i === 0 ? "bg-bsh-gold/5" : ""
                    }`}
                  >
                    <td className="py-3 pr-4 text-bsh-gold font-display">
                      {i + 1}
                    </td>
                    <td className="py-3 pr-4 font-semibold whitespace-nowrap">
                      {r.team_name}
                    </td>
                    <td className="py-3 px-2 text-center text-white/60">
                      {r.games_played}
                    </td>
                    <td className="py-3 px-2 text-center text-green-400 font-semibold">
                      {r.wins}
                    </td>
                    <td className="py-3 px-2 text-center text-red-400 font-semibold">
                      {r.losses}
                    </td>
                    <td className="py-3 px-2 text-center text-bsh-orange font-bold">
                      {(r.win_pct * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-2 text-center text-white/60">
                      {r.points_for}
                    </td>
                    <td className="py-3 px-2 text-center text-white/60">
                      {r.points_against}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold">
                      {r.point_diff >= 0 ? "+" : ""}
                      {r.point_diff}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          streak?.positive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {streak?.label ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-white/50">
          Aucun match playoff joué pour le moment.
        </p>
      )}
    </div>
  );
}
