// Calculs "stats générale" d'une saison archivée (saison régulière +
// playoffs combinés) — utilisés par ArchiveSeasonStats.tsx. Extraits dans
// un fichier à part pour rester lisibles/testables indépendamment du JSX.

export type ArchiveGame = {
  id: string;
  game_date: string;
  status: string;
  phase: string | null;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
  home_team_id: string;
  away_team_id: string;
};

export type ArchivePlayoffGame = {
  id: string;
  game_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
  team_home_id: string;
  team_away_id: string;
};

type PlayerRef = {
  name: string;
  position: string | null;
  team: { name: string } | null;
} | null;

export type ArchivePlayerGameStat = {
  game_id: string;
  player_id: string;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  fga: number | null;
  fgm: number | null;
  fta: number | null;
  ftm: number | null;
  player: PlayerRef;
};

export type ArchivePlayoffPlayerStat = {
  playoff_game_id: string;
  player_id: string;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  fga: number | null;
  fgm: number | null;
  fta: number | null;
  ftm: number | null;
  player: PlayerRef;
};

export type TeamStanding = {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

export function computeCombinedStandings(
  games: ArchiveGame[],
  playoffGames: ArchivePlayoffGame[]
): TeamStanding[] {
  const records = new Map<string, TeamStanding>();

  const ensure = (teamId: string, teamName: string) => {
    if (!records.has(teamId)) {
      records.set(teamId, {
        teamId,
        teamName,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      });
    }
    return records.get(teamId)!;
  };

  const apply = (
    homeId: string,
    homeName: string,
    awayId: string,
    awayName: string,
    homeScore: number | null,
    awayScore: number | null,
    status: string
  ) => {
    if (status !== "completed" || homeScore === null || awayScore === null) return;
    const home = ensure(homeId, homeName);
    const away = ensure(awayId, awayName);
    home.pointsFor += homeScore;
    home.pointsAgainst += awayScore;
    away.pointsFor += awayScore;
    away.pointsAgainst += homeScore;
    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
    } else if (awayScore > homeScore) {
      away.wins += 1;
      home.losses += 1;
    }
  };

  for (const g of games) {
    apply(
      g.home_team_id,
      g.home_team?.name ?? "?",
      g.away_team_id,
      g.away_team?.name ?? "?",
      g.home_score,
      g.away_score,
      g.status
    );
  }
  for (const g of playoffGames) {
    apply(
      g.team_home_id,
      g.home_team?.name ?? "?",
      g.team_away_id,
      g.away_team?.name ?? "?",
      g.home_score,
      g.away_score,
      g.status
    );
  }

  return Array.from(records.values()).sort((a, b) => {
    const pctA = a.wins + a.losses > 0 ? a.wins / (a.wins + a.losses) : 0;
    const pctB = b.wins + b.losses > 0 ? b.wins / (b.wins + b.losses) : 0;
    if (pctB !== pctA) return pctB - pctA;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst);
  });
}

export type LeaderRow = {
  player_id: string;
  player_name: string;
  position: string | null;
  team_name: string;
  games_played: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  pir: number;
};

// Même formule PIR "maison" que la vue `player_season_stats` (voir Supabase),
// calculée par ligne puis moyennée — pour rester cohérent avec le reste du
// site plutôt que d'inventer une 3e formule pour les stats combinées.
function linePir(line: {
  pts: number | null;
  reb: number | null;
  ast: number | null;
  fga: number | null;
  fta: number | null;
}): number {
  const pts = line.pts ?? 0;
  const reb = line.reb ?? 0;
  const ast = line.ast ?? 0;
  const fga = line.fga ?? 0;
  const fta = line.fta ?? 0;
  const denom = 2 * (fga + 0.44 * fta);
  const efficiencyBonus = denom === 0 ? 0 : (pts / denom) * 20;
  return pts + reb + ast + efficiencyBonus;
}

export function computeCombinedLeaders(
  regularStats: ArchivePlayerGameStat[],
  playoffStats: ArchivePlayoffPlayerStat[]
): LeaderRow[] {
  type Accum = {
    playerName: string;
    position: string | null;
    teamName: string;
    games: number;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    pirSum: number;
  };

  const byPlayer = new Map<string, Accum>();

  const addLine = (
    playerId: string,
    player: PlayerRef,
    line: {
      pts: number | null;
      reb: number | null;
      ast: number | null;
      stl: number | null;
      blk: number | null;
      fga: number | null;
      fta: number | null;
    }
  ) => {
    if (!player) return;
    let acc = byPlayer.get(playerId);
    if (!acc) {
      acc = {
        playerName: player.name,
        position: player.position,
        teamName: player.team?.name ?? "?",
        games: 0,
        pts: 0,
        reb: 0,
        ast: 0,
        stl: 0,
        blk: 0,
        pirSum: 0,
      };
      byPlayer.set(playerId, acc);
    }
    acc.games += 1;
    acc.pts += line.pts ?? 0;
    acc.reb += line.reb ?? 0;
    acc.ast += line.ast ?? 0;
    acc.stl += line.stl ?? 0;
    acc.blk += line.blk ?? 0;
    acc.pirSum += linePir(line);
  };

  for (const s of regularStats) {
    addLine(s.player_id, s.player, s);
  }
  for (const s of playoffStats) {
    addLine(s.player_id, s.player, s);
  }

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return Array.from(byPlayer.entries())
    .map(([playerId, acc]) => ({
      player_id: playerId,
      player_name: acc.playerName,
      position: acc.position,
      team_name: acc.teamName,
      games_played: acc.games,
      ppg: round1(acc.pts / acc.games),
      rpg: round1(acc.reb / acc.games),
      apg: round1(acc.ast / acc.games),
      spg: round1(acc.stl / acc.games),
      bpg: round1(acc.blk / acc.games),
      pir: round1(acc.pirSum / acc.games),
    }))
    .sort((a, b) => b.pir - a.pir);
}
