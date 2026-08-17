// Abréviations spécifiques pour les noms d'équipes composés, où garder juste
// le premier mot ne suffit pas (ex: "Pont Tambour Guardians" -> "P. Tambour").
const TEAM_ABBREVIATIONS: Record<string, string> = {
  "Pont Tambour Guardians": "P. Tambour",
  "Pivert Ballers": "Pivert",
};

// Abrège un nom d'équipe long pour les contextes compacts (cards de match sur mobile).
export function shortTeamName(name: string, maxLength = 14): string {
  if (TEAM_ABBREVIATIONS[name]) return TEAM_ABBREVIATIONS[name];
  if (name.length <= maxLength) return name;
  const firstWord = name.split(" ")[0];
  return firstWord.length <= maxLength ? firstWord : firstWord.slice(0, maxLength);
}
