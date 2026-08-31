// Une saison basket va généralement de juillet à juin.
// Ex: un match en janvier 2026 appartient à la saison "2025-2026".
export function seasonLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function currentSeasonLabel(): string {
  return seasonLabel(new Date().toISOString());
}

// --- Overrides pour des saisons fermées "à la main" avant la fin de
// l'année scolaire calculée ci-dessus. Utile pour une ligue comme SUBLE qui
// tourne par sessions courtes plutôt que par année scolaire comme AHBB :
// sans ça, juillet-août 2026 resterait classé dans la saison "en cours"
// "2026-2027" jusqu'à juillet 2027. Ajout ponctuel, décidé au cas par cas
// (voir claude/CLAUDE.md) — pas un système généralisé à toutes les ligues.
type SeasonOverride = {
  leagueSlug: string;
  displayLabel: string;
  // "YYYY-MM-DD" inclusif — tout match à cette date ou avant, pour cette
  // ligue, tombe dans cette saison archivée plutôt que dans le calcul
  // standard. Un futur match daté après cette date repasse par le calcul
  // standard (année scolaire), donc une nouvelle saison SUBLE n'a pas
  // besoin d'un nouvel override pour être détectée comme "en cours".
  upToDate: string;
};

const SEASON_OVERRIDES: SeasonOverride[] = [
  { leagueSlug: "suble", displayLabel: "SUBLE Août 2026", upToDate: "2026-08-31" },
];

function overrideFor(leagueSlug: string, dateStr: string): SeasonOverride | null {
  const d = dateStr.slice(0, 10);
  return (
    SEASON_OVERRIDES.find((o) => o.leagueSlug === leagueSlug && d <= o.upToDate) ?? null
  );
}

// Label à afficher pour un match donné (override manuel si présent, sinon
// le calcul standard année scolaire).
export function displaySeasonLabel(leagueSlug: string, dateStr: string): string {
  return overrideFor(leagueSlug, dateStr)?.displayLabel ?? seasonLabel(dateStr);
}

// Un match compte-t-il comme faisant partie de la saison en cours (page
// "Matchs") ou d'une saison archivée, pour cette ligue ?
export function isCurrentSeasonGame(leagueSlug: string, dateStr: string): boolean {
  if (overrideFor(leagueSlug, dateStr)) return false;
  return seasonLabel(dateStr) === currentSeasonLabel();
}
